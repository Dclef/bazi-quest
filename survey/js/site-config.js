/**
 * 站点运行时配置
 * 默认通过同源 /api 访问 Worker；本地预览时默认走线上接口。
 */

window.SURVEY_CONFIG = window.SURVEY_CONFIG || {};

const defaultApiBaseUrl = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'https://bazi.dclef.com/api'
  : '/api';

const existingApiConfig = window.SURVEY_CONFIG.api || {};

window.SURVEY_CONFIG.api = {
  baseUrl: defaultApiBaseUrl,
  timeoutMs: 15000,
  ...existingApiConfig
};
