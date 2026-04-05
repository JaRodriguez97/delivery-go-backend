import { IOrdersRepository } from "../../domain/repositories/orders.repository";

export class DeleteOrderUseCase {
  constructor(private repo: IOrdersRepository) {}

  async execute(id: string) {
    return this.repo.deleteOrder(id);
  }
}
