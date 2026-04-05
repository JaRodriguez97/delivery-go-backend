import {
  IOrdersRepository,
  OrderFilters,
} from "../../domain/repositories/orders.repository";
import { PaginationParams } from "../../../../shared/utils/pagination";

export class GetOrdersUseCase {
  constructor(private repo: IOrdersRepository) {}

  async execute(filters: OrderFilters, pagination: PaginationParams) {
    const [kpis, orders] = await Promise.all([
      this.repo.getKpis(),
      this.repo.getOrders(filters, pagination),
    ]);
    return { kpis, ...orders };
  }
}
