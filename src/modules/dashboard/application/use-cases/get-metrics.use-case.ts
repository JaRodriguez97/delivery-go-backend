import { IDashboardRepository } from "../../domain/repositories/dashboard.repository";

export class GetMetricsUseCase {
  constructor(private repo: IDashboardRepository) {}

  async execute() {
    return this.repo.getMetrics();
  }
}
