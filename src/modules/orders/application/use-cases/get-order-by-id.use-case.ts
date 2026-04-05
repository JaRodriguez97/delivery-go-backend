import { IOrdersRepository } from "../../domain/repositories/orders.repository";

export class GetOrderByIdUseCase {
  constructor(private repo: IOrdersRepository) {}

  async execute(id: string) {
    return this.repo.getOrderById(id);
  }
}
