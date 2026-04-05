import { IDashboardRepository } from "../../domain/repositories/dashboard.repository";

export class GetRecentOrdersUseCase {
  constructor(private repo: IDashboardRepository) {}

  async execute(limit: number = 10) {
    return this.repo.getRecentOrders(limit);
  }
}
