import api from '../api/axiosClient';
import type { AxiosInstance, AxiosResponse } from 'axios';

// Health check
export const getHealth = async (): Promise<any> => {
  const response: AxiosResponse = await api.get('/health');
  return response.data;
};

// Users
export const getUsers = async (): Promise<any> => {
  const response: AxiosResponse = await api.get('/v1/users');
  return response.data;
};

export const getUser = async (id: string): Promise<any> => {
  const response: AxiosResponse = await api.get(`/v1/users/${id}`);
  return response.data;
};

export const createUser = async (userData: any): Promise<any> => {
  const response: AxiosResponse = await api.post('/v1/users/', userData);
  return response.data;
};

// Sites
export const getSites = async (params: Record<string, any> = {}): Promise<any> => {
  const response: AxiosResponse = await api.get('/v1/sites/', { params });
  return response.data;
};

export const getSite = async (id: string): Promise<any> => {
  const response: AxiosResponse = await api.get(`/v1/sites/${id}`);
  return response.data;
};

export const createSite = async (siteData: any): Promise<any> => {
  const response: AxiosResponse = await api.post('/v1/sites/', siteData);
  return response.data;
};

export const updateSite = async (id: string, siteData: any): Promise<any> => {
  const response: AxiosResponse = await api.patch(`/v1/sites/${id}`, siteData);
  return response.data;
};

export const deleteSite = async (id: string): Promise<void> => {
  await api.delete(`/v1/sites/${id}`);
};

// Check site dependencies before deletion
export const getSiteDependencies = async (id: string): Promise<{
  cashRegisters: any[];
  cashSessions: any[];
  hasBlockingDependencies: boolean;
  error?: string;
}> => {
  try {
    // Check cash registers using this site
    const cashRegistersResponse: AxiosResponse = await api.get('/v1/cash-registers/', {
      params: { site_id: id }
    });
    const cashRegisters = cashRegistersResponse.data;

    // Check cash sessions using this site
    const cashSessionsResponse: AxiosResponse = await api.get('/v1/cash-sessions/', {
      params: { site_id: id }
    });
    const cashSessions = cashSessionsResponse.data;

    return {
      cashRegisters: cashRegisters || [],
      cashSessions: cashSessions || [],
      hasBlockingDependencies: (cashRegisters?.length > 0) || (cashSessions?.length > 0)
    };
  } catch (error) {
    console.error('Error checking site dependencies:', error);
    // If we can't check dependencies, err on the side of caution
    return {
      cashRegisters: [],
      cashSessions: [],
      hasBlockingDependencies: false,
      error: 'Impossible de vérifier les dépendances du site'
    };
  }
};

// Deposits
export const getDeposits = async (): Promise<any> => {
  const response: AxiosResponse = await api.get('/v1/deposits');
  return response.data;
};

export const getDeposit = async (id: string): Promise<any> => {
  const response: AxiosResponse = await api.get(`/v1/deposits/${id}`);
  return response.data;
};

export const createDeposit = async (depositData: any): Promise<any> => {
  const response: AxiosResponse = await api.post('/v1/deposits/', depositData);
  return response.data;
};

// Sales
export const getSales = async (): Promise<any> => {
  const response: AxiosResponse = await api.get('/v1/sales');
  return response.data;
};

export const getSale = async (id: string): Promise<any> => {
  const response: AxiosResponse = await api.get(`/v1/sales/${id}`);
  return response.data;
};

export const createSale = async (saleData: any): Promise<any> => {
  const response: AxiosResponse = await api.post('/v1/sales/', saleData);
  return response.data;
};

// Cash Sessions
export const getCashSessions = async (): Promise<any> => {
  const response: AxiosResponse = await api.get('/v1/cash-sessions');
  return response.data;
};

export const getCashSession = async (id: string): Promise<any> => {
  const response: AxiosResponse = await api.get(`/v1/cash-sessions/${id}`);
  return response.data;
};

export const createCashSession = async (sessionData: any): Promise<any> => {
  const response: AxiosResponse = await api.post('/v1/cash-sessions/', sessionData);
  return response.data;
};

// Cash Registers (Postes de caisse)
export const getCashRegisters = async (params: Record<string, any> = {}): Promise<any> => {
  const response: AxiosResponse = await api.get('/v1/cash-registers/', { params });
  return response.data;
};

export const getCashRegister = async (id: string): Promise<any> => {
  const response: AxiosResponse = await api.get(`/v1/cash-registers/${id}`);
  return response.data;
};

export const createCashRegister = async (data: any): Promise<any> => {
  const response: AxiosResponse = await api.post('/v1/cash-registers/', data);
  return response.data;
};

export const updateCashRegister = async (id: string, data: any): Promise<any> => {
  const response: AxiosResponse = await api.patch(`/v1/cash-registers/${id}`,
    data
  );
  return response.data;
};

export const deleteCashRegister = async (id: string): Promise<void> => {
  await api.delete(`/v1/cash-registers/${id}`);
};

// Link Telegram Account
export const linkTelegramAccount = async (linkData: any): Promise<any> => {
  const response: AxiosResponse = await api.post('/v1/users/link-telegram', linkData);
  return response.data;
};

// Reception Tickets
export const getReceptionTickets = async (page: number = 1, perPage: number = 10): Promise<any> => {
  const response: AxiosResponse = await api.get('/v1/reception/tickets', {
    params: { page, per_page: perPage }
  });
  return response.data;
};

export const getReceptionTicketDetail = async (ticketId: string): Promise<any> => {
  const response: AxiosResponse = await api.get(`/v1/reception/tickets/${ticketId}`);
  return response.data;
};

// Cash Session Statistics
export const getCashSessionStats = async (dateFrom?: string, dateTo?: string): Promise<any> => {
  const params: Record<string, any> = {};
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;

  const response: AxiosResponse = await api.get('/v1/cash-sessions/stats/summary', { params });
  return response.data;
};

// Reception Statistics
export const getReceptionSummary = async (startDate?: string, endDate?: string): Promise<any> => {
  const params: Record<string, any> = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;

  const response: AxiosResponse = await api.get('/v1/stats/reception/summary', { params });
  return response.data;
};

export const getReceptionByCategory = async (startDate?: string, endDate?: string): Promise<any> => {
  const params: Record<string, any> = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;

  const response: AxiosResponse = await api.get('/v1/stats/reception/by-category', { params });
  return response.data;
};

// Sales Statistics
export const getSalesByCategory = async (startDate?: string, endDate?: string): Promise<any> => {
  const params: Record<string, any> = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;

  const response: AxiosResponse = await api.get('/v1/stats/sales/by-category', { params });
  return response.data;
};

// Reception Reports
export const getReceptionLignes = async (
  page: number = 1,
  perPage: number = 50,
  startDate?: string,
  endDate?: string,
  categoryId?: string
): Promise<any> => {
  const params: Record<string, any> = { page, per_page: perPage };
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  if (categoryId) params.category_id = categoryId;

  const response: AxiosResponse = await api.get('/v1/reception/lignes', { params });
  return response.data;
};

export const exportReceptionLignesCSV = async (
  startDate?: string,
  endDate?: string,
  categoryId?: string
): Promise<{ blob: Blob; filename: string }> => {
  const params: Record<string, any> = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  if (categoryId) params.category_id = categoryId;

  const response: AxiosResponse<Blob> = await api.get('/v1/reception/lignes/export-csv', {
    params,
    responseType: 'blob'
  });

  // Essayer d'extraire le filename du Content-Disposition
  let filename = 'rapport_reception.csv';
  const cd = response.headers && (response.headers['content-disposition'] || response.headers['Content-Disposition']);
  if (cd && typeof cd === 'string') {
    const match = cd.match(/filename\*=UTF-8''([^;\n]+)|filename="?([^";\n]+)"?/i);
    const extracted = match ? (match[1] || match[2]) : null;
    if (extracted) {
      try {
        filename = decodeURIComponent(extracted);
      } catch (_) {
        filename = extracted;
      }
    }
  }

  return { blob: response.data, filename };
};

// Reception Live Stats (B38-P2)
export const getReceptionLiveStats = async (): Promise<any> => {
  const response: AxiosResponse = await api.get('/v1/reception/stats/live');
  return response.data;
};

// Unified Live Stats (B48-P7)
export const getUnifiedLiveStats = async (periodType: string = 'daily'): Promise<any> => {
  const response: AxiosResponse = await api.get('/v1/stats/live', {
    params: { period_type: periodType }
  });
  return response.data;
};

// Cash Live Stats (B40-P2)
export const getCashLiveStats = async (): Promise<any> => {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  
  const params: Record<string, any> = {
    date_from: startOfDay.toISOString(),
    date_to: endOfDay.toISOString()
  };
  
  const response: AxiosResponse = await api.get('/v1/cash-sessions/stats/summary', { params });
  return response.data;
};

// Reception Categories
export const getReceptionCategories = async (): Promise<any> => {
  const response: AxiosResponse = await api.get('/v1/reception/categories');
  return response.data;
};

export default api as AxiosInstance;

