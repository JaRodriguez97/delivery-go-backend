import { Request, Response } from "express";
import { PrismaOrdersRepository } from "../../infrastructure/repositories/prisma-orders.repository";
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
  static async list(req: Request, res: Response) {
    try {
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
      const result = await createOrder.execute(req.body);
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
}
