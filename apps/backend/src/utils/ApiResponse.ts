class ApiResponse<T> {
  status: number;
  message: string;
  data: T;
  sucess: boolean;

  constructor(status: number, message = "Success", data: T) {
    this.status = status;
    this.message = message;
    this.data = data;
    this.sucess = status < 400;
  }
}

export { ApiResponse };
