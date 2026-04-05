import { IOrdersRepository } from "../../domain/repositories/orders.repository";
import { UpdateOrderDto } from "../dtos/orders.dto";

export class UpdateOrderUseCase {
  constructor(private repo: IOrdersRepository) {}

  async execute(id: string, data: UpdateOrderDto) {
    return this.repo.updateOrder(id, data);
  }
}
