import { CreateUserDto, UpdateUserDto } from "../../application/dtos/users.dto";

export interface IUsersRepository {
  getUsers(
    filters: {
      role?: string;
      search?: string;
    },
    pagination: {
      page: number;
      limit: number;
    }
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }>;

  getUserById(id: string): Promise<any | null>;

  createUser(data: CreateUserDto): Promise<any>;

  updateUser(id: string, data: UpdateUserDto): Promise<any>;

  deleteUser(id: string): Promise<boolean>;
}
