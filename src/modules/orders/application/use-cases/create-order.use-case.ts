import { IOrdersRepository } from "../../domain/repositories/orders.repository";
import { CreateOrderDto } from "../dtos/orders.dto";

export class CreateOrderUseCase {
  constructor(private repo: IOrdersRepository) {}

  async execute(data: CreateOrderDto) {
    return this.repo.createOrder(data);
  }
}
