import { Request, Response } from "express";
import { PrismaOrdersRepository } from "../../infrastructure/repositories/prisma-orders.repository";
import { prisma } from "../../../../shared/config/database";
import { AuthenticatedRequest } from "../../../../shared/types/authenticated-request";
import { GetOrdersUseCase } from "../../application/use-cases/get-orders.use-case";
import { GetOrderByIdUseCase } from "../../application/use-cases/get-order-by-id.use-case";
import { CreateOrderUseCase } from "../../application/use-cases/create-order.use-case";
import { UpdateOrderUseCase } from "../../application/use-cases/update-order.use-case";
import { DeleteOrderUseCase } from "../../application/use-cases/delete-order.use-case";
import { parsePagination } from "../../../../shared/utils/pagination";

const repo = new PrismaOrdersRepository();
const getOrders = new GetOrdersUseCase(repo);
const getOrderById = new GetOrderByIdUseCase(repo);
const createOrder = new CreateOrderUseCase(repo);
const updateOrder = new UpdateOrderUseCase(repo);
const deleteOrder = new DeleteOrderUseCase(repo);

export class OrdersController {
  static async startPreparing(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const order = await prisma.order.findUnique({
        where: { id: req.params.id as string },
        include: {
          restaurant: {
            select: {
              owner: { select: { userId: true } },
            },
          },
          status: { select: { name: true } },
        },
      });

      if (!order) {
        res.status(404).json({ error: "Pedido no encontrado" });
        return;
      }

      if (
        req.user?.role === "RESTAURANT" &&
        order.restaurant?.owner?.userId !== userId
      ) {
        res
          .status(403)
          .json({ error: "No autorizado para actualizar este pedido" });
        return;
      }

      const currentStatus = String(order.status?.name ?? "").toUpperCase();
      if (!["PENDING", "CONFIRMED"].includes(currentStatus)) {
        res.status(400).json({ error: "El pedido no está en estado inicial" });
        return;
      }

      const preparingStatus = await prisma.orderStatus.findFirst({
        where: { name: "PREPARING" },
        select: { id: true, name: true },
      });

      if (!preparingStatus?.id) {
        res
          .status(500)
          .json({ error: "No existe el estado PREPARING configurado" });
        return;
      }

      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { statusId: preparingStatus.id, updatedAt: new Date() },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            statusId: preparingStatus.id,
            changedAt: new Date(),
          },
        });
      });

      res.json({ message: "Pedido marcado en preparación" });
    } catch {
      res.status(500).json({ error: "Error al iniciar preparación" });
    }
  }

  static async available(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const courier = await prisma.courier.findFirst({
        where: { userId },
        select: {
          id: true,
          availability: {
            select: { isOnline: true },
          },
        },
      });

      if (!courier) {
        res.status(404).json({ error: "Repartidor no encontrado" });
        return;
      }

      // Solo bloquea si el estado online existe y es explicitamente false.
      if (courier.availability?.isOnline === false) {
        res.json({ data: [] });
        return;
      }

      const data = await repo.getAvailableOrders(courier.id);
      res.json({ data });
    } catch (error: any) {
      res.status(500).json({
        error: error?.message || "Error al obtener pedidos disponibles",
      });
    }
  }

  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      let restaurantIdFilter: string | undefined;

      if (req.user?.role === "RESTAURANT") {
        const ownedRestaurant = await prisma.restaurant.findFirst({
          where: { owner: { userId: req.user.userId } },
          select: { id: true },
        });

        restaurantIdFilter = ownedRestaurant?.id;
      }

      const pagination = parsePagination(req);
      const filters = {
        status: req.query.status as string | undefined,
        search: req.query.search as string | undefined,
        dateFrom: req.query.dateFrom
          ? new Date(req.query.dateFrom as string)
          : undefined,
        dateTo: req.query.dateTo
          ? new Date(req.query.dateTo as string)
          : undefined,
        restaurantId: restaurantIdFilter,
      };
      const result = await getOrders.execute(filters, pagination);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener pedidos" });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const order = await getOrderById.execute(req.params.id as string);
      if (!order) {
        res.status(404).json({ error: "Pedido no encontrado" });
        return;
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener pedido" });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const payload = { ...req.body } as any;
      const authReq = req as AuthenticatedRequest;

      if (!payload.restaurantId && authReq.user?.userId) {
        const restaurant = await prisma.restaurant.findFirst({
          where: { owner: { userId: authReq.user.userId } },
          select: { id: true },
        });
        payload.restaurantId = restaurant?.id;
      }

      const result = await createOrder.execute(payload);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: "Error al crear pedido" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      await updateOrder.execute(req.params.id as string, req.body);
      res.json({ message: "Pedido actualizado" });
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar pedido" });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      await deleteOrder.execute(req.params.id as string);
      res.json({ message: "Pedido cancelado" });
    } catch (error) {
      res.status(500).json({ error: "Error al cancelar pedido" });
    }
  }

  static async acceptAssignment(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const courier = await prisma.courier.findFirst({
        where: { userId },
        select: { id: true },
      });

      if (!courier) {
        res.status(404).json({ error: "Repartidor no encontrado" });
        return;
      }

      await repo.acceptAssignment(req.params.id as string, courier.id);
      res.json({ message: "Servicio aceptado" });
    } catch (error: any) {
      res.status(400).json({
        error: error?.message || "No fue posible aceptar el servicio",
      });
    }
  }

  static async rejectAssignment(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const courier = await prisma.courier.findFirst({
        where: { userId },
        select: { id: true },
      });

      if (!courier) {
        res.status(404).json({ error: "Repartidor no encontrado" });
        return;
      }

      await repo.rejectAssignment(req.params.id as string, courier.id);
      res.json({ message: "Servicio rechazado" });
    } catch (error: any) {
      res.status(400).json({
        error: error?.message || "No fue posible rechazar el servicio",
      });
    }
  }

  static async updateDeliveryStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const status = req.body?.status as string | undefined;
      if (!status) {
        res.status(400).json({ error: "status es requerido" });
        return;
      }

      await repo.updateDeliveryStatus(req.params.id as string, status);
      res.json({ message: "Estado de entrega actualizado" });
    } catch (error: any) {
      res.status(400).json({
        error: error?.message || "No fue posible actualizar el estado",
      });
    }
  }
}
