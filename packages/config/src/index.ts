/**
 * Environment configuration schema and helper methods for RT-CFAS
 */

export interface ApiConfig {
  port: number;
  nodeEnv: string;
  frontendUrl: string;
  databaseUrl?: string;
  etherscanApiKey?: string;
  riskServiceUrl: string;
}

export function getApiConfig(): ApiConfig {
  return {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    databaseUrl: process.env.DATABASE_URL,
    etherscanApiKey: process.env.ETHERSCAN_API_KEY,
    riskServiceUrl: process.env.RISK_SERVICE_URL || 'http://localhost:8000',
  };
}
