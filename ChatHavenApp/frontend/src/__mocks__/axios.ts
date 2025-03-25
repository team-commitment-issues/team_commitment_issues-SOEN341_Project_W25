const axios = {
    defaults: {
      headers: {
        common: {}
      }
    },
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    put: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
    isAxiosError: jest.fn().mockReturnValue(false)
  };
  
  export default axios;