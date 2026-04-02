/**
 * API Gateway System
 * Service management and API routing infrastructure
 */

export interface APIEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  service: string; // Target service name
  version: string; // API version
  description: string;
  parameters: Array<{
    name: string;
    type: 'query' | 'path' | 'header' | 'body';
    required: boolean;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
      enum?: string[];
    };
    defaultValue?: any;
  }>;
  responses: Array<{
    statusCode: number;
    description: string;
    schema?: any;
    headers?: { [key: string]: string };
  }>;
  security: {
    authentication: 'none' | 'api_key' | 'jwt' | 'oauth2' | 'basic';
    authorization: string[]; // Required roles/permissions
    rateLimit: {
      requests: number;
      window: number; // in seconds
      perUser?: boolean;
      perIP?: boolean;
    };
    cors: {
      enabled: boolean;
      origins: string[];
      methods: string[];
      headers: string[];
      credentials: boolean;
    };
  };
  middleware: string[]; // Middleware function names
  deprecated: boolean;
  deprecationMessage?: string;
}

export interface Service {
  id: string;
  name: string;
  version: string;
  description: string;
  type: 'microservice' | 'external' | 'database' | 'function';
  endpoints: string[]; // Endpoint IDs
  configuration: {
    protocol: 'http' | 'https' | 'websocket' | 'grpc';
    host: string;
    port: number;
    basePath: string;
    timeout: number; // in milliseconds
    retryPolicy: {
      maxAttempts: number;
      backoffMultiplier: number;
      maxDelay: number; // in milliseconds
    };
    healthCheck: {
      enabled: boolean;
      endpoint: string;
      interval: number; // in seconds
      timeout: number; // in milliseconds
    };
  };
  status: {
    isOnline: boolean;
    lastHealthCheck: number;
    responseTime: number; // in milliseconds
    errorRate: number; // 0-100
    uptime: number; // 0-100
    lastError?: {
      timestamp: number;
      message: string;
      type: string;
    };
  };
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number; // in milliseconds
    requestsPerSecond: number;
    errorRate: number; // 0-100
  };
  deployment: {
    environment: 'development' | 'staging' | 'production';
    version: string;
    deployedAt: number;
    deployedBy: string;
    rollbackVersion?: string;
  };
}

export interface Route {
  id: string;
  path: string;
  method: string;
  service: string;
  endpoint: string;
  priority: number; // 1-100
  conditions: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'matches' | 'not_matches';
    value: any;
    caseSensitive?: boolean;
  }>;
  transformations: Array<{
    type: 'header_add' | 'header_remove' | 'query_add' | 'query_remove' | 'path_rewrite' | 'response_transform';
    config: {
      [key: string]: any;
    };
  }>;
  loadBalancing: {
    strategy: 'round_robin' | 'least_connections' | 'weighted' | 'random';
    weights?: { [service: string]: number };
  };
  caching: {
    enabled: boolean;
    ttl: number; // in seconds
    key: string;
    varyHeaders?: string[];
  };
  rateLimit: {
    enabled: boolean;
    requests: number;
    window: number; // in seconds
    strategy: 'fixed' | 'sliding' | 'token_bucket';
    burstLimit?: number;
  };
}

export interface APIRequest {
  id: string;
  timestamp: number;
  method: string;
  path: string;
  headers: { [key: string]: string };
  query: { [key: string]: string };
  body: any;
  client: {
    ip: string;
    userAgent: string;
    userId?: string;
    sessionId?: string;
    apiKey?: string;
  };
  routing: {
    service: string;
    endpoint: string;
    matchedRoute?: string;
    loadBalancer?: string;
  };
  processing: {
    startTime: number;
    endTime?: number;
    duration?: number; // in milliseconds
    middleware: string[];
    cacheHit: boolean;
  };
  response: {
    statusCode: number;
    headers: { [key: string]: string };
    body: any;
    size: number; // in bytes
    fromCache: boolean;
    serviceResponseTime?: number; // Time from upstream service
  };
  error?: {
    type: string;
    message: string;
    details?: any;
    stackTrace?: string;
  };
}

export interface APIGateway {
  id: string;
  name: string;
  version: string;
  description: string;
  configuration: {
    port: number;
    host: string;
    protocol: 'http' | 'https';
    ssl: {
      enabled: boolean;
      certificate: string;
      key: string;
      ca: string;
    };
    cors: {
      enabled: boolean;
      origins: string[];
      methods: string[];
      headers: string[];
      credentials: boolean;
    };
    compression: {
      enabled: boolean;
      algorithms: string[];
      level: number; // 1-9
    };
    logging: {
      enabled: boolean;
      level: 'error' | 'warn' | 'info' | 'debug';
      format: 'json' | 'text' | 'custom';
      destination: 'console' | 'file' | 'service';
    };
    monitoring: {
      enabled: boolean;
      metrics: Array<{
        name: string;
        type: 'counter' | 'histogram' | 'gauge';
        labels: { [key: string]: string };
      }>;
      healthChecks: Array<{
        name: string;
        endpoint: string;
        interval: number;
        timeout: number;
      }>;
    };
  };
  endpoints: string[]; // Endpoint IDs
  routes: string[]; // Route IDs
  services: string[]; // Service IDs
  middleware: string[]; // Middleware function names
  status: {
    isRunning: boolean;
    startTime: number;
    requestsProcessed: number;
    errors: Array<{
      timestamp: number;
      type: string;
      message: string;
      count: number;
    }>;
  };
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
    activeConnections: number;
    cacheHitRate: number;
  };
}

export class APIGatewaySystem {
  private gateways: Map<string, APIGateway> = new Map();
  private endpoints: Map<string, APIEndpoint> = new Map();
  private services: Map<string, Service> = new Map();
  private routes: Map<string, Route> = new Map();
  private requests: Map<string, APIRequest> = new Map();
  private middleware: Map<string, Function> = new Map();
  private cache: Map<string, { data: any; expires: number; headers?: { [key: string]: string } }> = new Map();
  private rateLimiters: Map<string, { count: number; resetTime: number }> = new Map();
  private callbacks: Map<string, Function[]> = new Map();
  private isProcessing: boolean = false;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadGateways();
    this.loadEndpoints();
    this.loadServices();
    this.loadRoutes();
    this.loadMiddleware();
    this.initializeDefaultGateway();
    this.startMetricsCollection();
    this.startCacheCleanup();
    this.startHealthChecks();
  }

  private loadGateways(): void {
    try {
      const gateways = localStorage.getItem('resqai_api_gateways');
      if (gateways) {
        const gatewayData = JSON.parse(gateways);
        gatewayData.forEach((gateway: APIGateway) => {
          this.gateways.set(gateway.id, gateway);
        });
      }
    } catch (error) {
      console.error('Failed to load API gateways:', error);
    }
  }

  private loadEndpoints(): void {
    try {
      const endpoints = localStorage.getItem('resqai_api_endpoints');
      if (endpoints) {
        const endpointData = JSON.parse(endpoints);
        endpointData.forEach((endpoint: APIEndpoint) => {
          this.endpoints.set(endpoint.id, endpoint);
        });
      }
    } catch (error) {
      console.error('Failed to load API endpoints:', error);
    }
  }

  private loadServices(): void {
    try {
      const services = localStorage.getItem('resqai_api_services');
      if (services) {
        const serviceData = JSON.parse(services);
        serviceData.forEach((service: Service) => {
          this.services.set(service.id, service);
        });
      }
    } catch (error) {
      console.error('Failed to load services:', error);
    }
  }

  private loadRoutes(): void {
    try {
      const routes = localStorage.getItem('resqai_api_routes');
      if (routes) {
        const routeData = JSON.parse(routes);
        routeData.forEach((route: Route) => {
          this.routes.set(route.id, route);
        });
      }
    } catch (error) {
      console.error('Failed to load routes:', error);
    }
  }

  private loadMiddleware(): void {
    try {
      const middleware = localStorage.getItem('resqai_api_middleware');
      if (middleware) {
        const middlewareData = JSON.parse(middleware);
        middlewareData.forEach((name: string, code: string) => {
          this.middleware.set(name, new Function('return ' + code));
        });
      }
    } catch (error) {
      console.error('Failed to load middleware:', error);
    }
  }

  private saveGateways(): void {
    try {
      const gatewayData = Array.from(this.gateways.values());
      localStorage.setItem('resqai_api_gateways', JSON.stringify(gatewayData));
    } catch (error) {
      console.error('Failed to save API gateways:', error);
    }
  }

  private saveEndpoints(): void {
    try {
      const endpointData = Array.from(this.endpoints.values());
      localStorage.setItem('resqai_api_endpoints', JSON.stringify(endpointData));
    } catch (error) {
      console.error('Failed to save API endpoints:', error);
    }
  }

  private saveServices(): void {
    try {
      const serviceData = Array.from(this.services.values());
      localStorage.setItem('resqai_api_services', JSON.stringify(serviceData));
    } catch (error) {
      console.error('Failed to save services:', error);
    }
  }

  private saveRoutes(): void {
    try {
      const routeData = Array.from(this.routes.values());
      localStorage.setItem('resqai_api_routes', JSON.stringify(routeData));
    } catch (error) {
      console.error('Failed to save routes:', error);
    }
  }

  private initializeDefaultGateway(): void {
    if (this.gateways.size === 0) {
      const defaultGateway: APIGateway = {
        id: 'default_gateway',
        name: 'Default API Gateway',
        version: '1.0.0',
        description: 'Default API gateway configuration',
        configuration: {
          port: 8080,
          host: 'localhost',
          protocol: 'http',
          ssl: {
            enabled: false,
            certificate: '',
            key: '',
            ca: ''
          },
          cors: {
            enabled: true,
            origins: ['*'],
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
            headers: ['Content-Type', 'Authorization'],
            credentials: true
          },
          compression: {
            enabled: true,
            algorithms: ['gzip', 'deflate'],
            level: 6
          },
          logging: {
            enabled: true,
            level: 'info',
            format: 'json',
            destination: 'console'
          },
          monitoring: {
            enabled: true,
            metrics: [
              {
                name: 'requests_total',
                type: 'counter',
                labels: { method: '*', status: '*', service: '*' }
              },
              {
                name: 'response_time',
                type: 'histogram',
                labels: { service: '*', endpoint: '*' }
              },
              {
                name: 'error_rate',
                type: 'gauge',
                labels: { service: '*', error_type: '*' }
              }
            ],
            healthChecks: [
              {
                name: 'gateway_health',
                endpoint: '/health',
                interval: 30,
                timeout: 5000
              }
            ]
          }
        },
        endpoints: [],
        routes: [],
        services: [],
        middleware: [],
        status: {
          isRunning: false,
          startTime: Date.now(),
          requestsProcessed: 0,
          errors: []
        },
        metrics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0,
          requestsPerSecond: 0,
          errorRate: 0,
          activeConnections: 0,
          cacheHitRate: 0
        }
      };

      this.gateways.set(defaultGateway.id, defaultGateway);
      this.saveGateways();
    }
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 60000); // Update metrics every minute
  }

  private startCacheCleanup(): void {
    // Clean expired cache entries every 5 minutes
    setInterval(() => {
      this.cleanupCache();
    }, 5 * 60 * 1000);
  }

  private startHealthChecks(): void {
    // Perform health checks every 30 seconds
    setInterval(() => {
      this.performHealthChecks();
    }, 30 * 1000);
  }

  public createGateway(gateway: Omit<APIGateway, 'id' | 'status' | 'metrics'>): string {
    const gatewayId = `gateway_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newGateway: APIGateway = {
      id: gatewayId,
      ...gateway,
      status: {
        isRunning: false,
        startTime: Date.now(),
        requestsProcessed: 0,
        errors: []
      },
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        requestsPerSecond: 0,
        errorRate: 0,
        activeConnections: 0,
        cacheHitRate: 0
      }
    };

    this.gateways.set(gatewayId, newGateway);
    this.saveGateways();
    this.emit('gatewayCreated', newGateway);

    return gatewayId;
  }

  public addEndpoint(endpoint: Omit<APIEndpoint, 'id'>): string {
    const endpointId = `endpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newEndpoint: APIEndpoint = {
      id: endpointId,
      ...endpoint
    };

    this.endpoints.set(endpointId, newEndpoint);
    this.saveEndpoints();
    this.emit('endpointAdded', newEndpoint);

    return endpointId;
  }

  public registerService(service: Omit<Service, 'id' | 'status' | 'metrics'>): string {
    const serviceId = `service_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newService: Service = {
      id: serviceId,
      ...service,
      status: {
        isOnline: false,
        lastHealthCheck: Date.now(),
        responseTime: 0,
        errorRate: 0,
        uptime: 0
      },
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        requestsPerSecond: 0,
        errorRate: 0
      },
      deployment: {
        environment: 'development',
        version: '1.0.0',
        deployedAt: Date.now(),
        deployedBy: 'system'
      }
    };

    this.services.set(serviceId, newService);
    this.saveServices();
    this.emit('serviceRegistered', newService);

    return serviceId;
  }

  public createRoute(route: Omit<Route, 'id'>): string {
    const routeId = `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newRoute: Route = {
      id: routeId,
      ...route
    };

    this.routes.set(routeId, newRoute);
    this.saveRoutes();
    this.emit('routeCreated', newRoute);

    return routeId;
  }

  public addMiddleware(name: string, code: string): boolean {
    try {
      const middlewareFunction = new Function('return ' + code);
      this.middleware.set(name, middlewareFunction);
      this.emit('middlewareAdded', { name, code });
      return true;
    } catch (error) {
      console.error(`Failed to add middleware ${name}:`, error);
      return false;
    }
  }

  public async processRequest(request: Omit<APIRequest, 'id' | 'timestamp' | 'processing'>): Promise<{
    success: boolean;
    response?: any;
    error?: string;
    statusCode?: number;
    headers?: { [key: string]: string };
    processingTime?: number;
  }> {
    const requestId = `request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const apiRequest: APIRequest = {
      id: requestId,
      timestamp: Date.now(),
      ...request,
      processing: {
        startTime: Date.now(),
        middleware: [],
        cacheHit: false
      }
    };

    this.requests.set(requestId, apiRequest);

    try {
      // Process request through pipeline
      const result = await this.processRequestPipeline(apiRequest);
      
      // Update request with processing details
      apiRequest.processing.endTime = Date.now();
      apiRequest.processing.duration = apiRequest.processing.endTime - apiRequest.processing.startTime;
      
      this.requests.set(requestId, apiRequest);
      this.updateGatewayMetrics(result.success, apiRequest.processing.duration);
      
      this.emit('requestProcessed', { request: apiRequest, result });
      
      return result;
      
    } catch (error) {
      apiRequest.processing.endTime = Date.now();
      apiRequest.processing.duration = apiRequest.processing.endTime - apiRequest.processing.startTime;
      apiRequest.error = {
        type: 'processing_error',
        message: error instanceof Error ? error.message : 'Request processing failed',
        stackTrace: error instanceof Error ? error.stack : undefined
      };
      
      this.requests.set(requestId, apiRequest);
      this.updateGatewayMetrics(false, apiRequest.processing.duration);
      
      this.emit('requestFailed', { request: apiRequest, error });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request processing failed',
        processingTime: apiRequest.processing.duration
      };
    }
  }

  private async processRequestPipeline(request: APIRequest): Promise<{
    success: boolean;
    response?: any;
    error?: string;
    statusCode?: number;
    headers?: { [key: string]: string };
  }> {
    try {
      // Step 1: Check cache
      const cacheResult = await this.checkCache(request);
      if (cacheResult.hit) {
        request.processing.cacheHit = true;
        return {
          success: true,
          response: cacheResult.data,
          headers: cacheResult.headers,
          statusCode: 200
        };
      }

      // Step 2: Apply rate limiting
      const rateLimitResult = await this.checkRateLimit(request);
      if (!rateLimitResult.allowed) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          statusCode: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
          }
        };
      }

      // Step 3: Apply middleware
      for (const middlewareName of this.getMiddlewareForRoute(request)) {
        const middleware = this.middleware.get(middlewareName);
        if (middleware) {
          const result = await middleware(request);
          if (result && typeof result === 'object') {
            Object.assign(request, result);
          }
        }
      }

      // Step 4: Route to service
      const route = await this.findRoute(request);
      if (!route) {
        return {
          success: false,
          error: 'No route found',
          statusCode: 404
        };
      }

      // Step 5: Call service
      const serviceResponse = await this.callService(route, request);

      // Step 6: Apply response transformations
      const transformedResponse = await this.applyResponseTransformations(route, serviceResponse);

      return transformedResponse;
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Pipeline processing failed',
        statusCode: 500
      };
    }
  }

  private async checkCache(request: APIRequest): Promise<{
    hit: boolean;
    data?: any;
    headers?: { [key: string]: string };
  }> {
    const cacheKey = this.generateCacheKey(request);
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expires > Date.now()) {
      return {
        hit: true,
        data: cached.data,
        headers: cached.headers
      };
    }

    return { hit: false };
  }

  private generateCacheKey(request: APIRequest): string {
    const key = `${request.method}:${request.path}:${JSON.stringify(request.query)}`;
    return btoa(key);
  }

  private async checkRateLimit(request: APIRequest): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
  }> {
    const clientId = request.client.ip || request.client.apiKey || 'anonymous';
    const now = Date.now();
    
    let limiter = this.rateLimiters.get(clientId);
    if (!limiter) {
      limiter = { count: 0, resetTime: now };
      this.rateLimiters.set(clientId, limiter);
    }

    // Reset if window has passed
    if (now > limiter.resetTime + 60000) { // 1 minute window
      limiter.count = 0;
      limiter.resetTime = now;
    }

    // Check limit (default: 100 requests per minute)
    const limit = 100;
    limiter.count++;

    return {
      allowed: limiter.count <= limit,
      limit,
      remaining: Math.max(0, limit - limiter.count),
      resetTime: limiter.resetTime + 60000
    };
  }

  private getMiddlewareForRoute(request: APIRequest): string[] {
    const route = Array.from(this.routes.values())
      .find(r => 
        r.path === request.path && 
        r.method === request.method
      );
    
    return route ? [] : []; // Default to empty for now
  }

  private async findRoute(request: APIRequest): Promise<Route | null> {
    const routes = Array.from(this.routes.values())
      .filter(r => 
        r.path === request.path && 
        r.method === request.method
      );

    if (routes.length === 0) return null;

    // Check conditions
    for (const route of routes) {
      const conditionsMet = route.conditions.every(condition => 
        this.evaluateCondition(condition, request)
      );
      
      if (conditionsMet) {
        return route;
      }
    }

    // Return highest priority route
    return routes.sort((a, b) => b.priority - a.priority)[0] || null;
  }

  private evaluateCondition(condition: Route['conditions'][0], request: APIRequest): boolean {
    const value = this.getRequestValue(request, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        return typeof value === 'string' && value.includes(condition.value);
      case 'not_contains':
        return typeof value === 'string' && !value.includes(condition.value);
      case 'matches':
        return typeof value === 'string' && new RegExp(condition.value).test(value);
      case 'not_matches':
        return typeof value === 'string' && !new RegExp(condition.value).test(value);
      default:
        return true;
    }
  }

  private getRequestValue(request: APIRequest, field: string): any {
    switch (field) {
      case 'path':
        return request.path;
      case 'method':
        return request.method;
      case 'header':
        return request.headers[field.split('.')[1]] || '';
      case 'query':
        return request.query[field] || '';
      case 'body':
        return request.body;
      default:
        return null;
    }
  }

  private async callService(route: Route, request: APIRequest): Promise<{
    success: boolean;
    response?: any;
    error?: string;
    statusCode?: number;
  }> {
    const service = this.services.get(route.service);
    if (!service) {
      return {
        success: false,
        error: 'Service not found',
        statusCode: 503
      };
    }

    try {
      // This would actually call the service
      console.log(`Calling service ${route.service} at ${service.configuration.host}:${service.configuration.port}`);
      
      // Simulate service call
      const responseTime = Math.random() * 1000 + 200;
      await new Promise(resolve => setTimeout(resolve, responseTime));
      
      // Update service metrics
      service.metrics.totalRequests++;
      service.metrics.averageResponseTime = 
        (service.metrics.averageResponseTime * (service.metrics.totalRequests - 1) + responseTime) / service.metrics.totalRequests;
      
      this.services.set(service.id, service);
      this.saveServices();
      
      return {
        success: true,
        response: { data: 'mock response', timestamp: Date.now() },
        statusCode: 200
      };
      
    } catch (error) {
      service.metrics.failedRequests++;
      service.metrics.errorRate = 
        (service.metrics.errorRate * (service.metrics.totalRequests - 1) + 100) / service.metrics.totalRequests;
      
      this.services.set(service.id, service);
      this.saveServices();
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Service call failed',
        statusCode: 500
      };
    }
  }

  private async applyResponseTransformations(route: Route, serviceResponse: any): Promise<{
    success: boolean;
    response?: any;
    error?: string;
    statusCode?: number;
    headers?: { [key: string]: string };
  }> {
    let response = serviceResponse;
    let headers: { [key: string]: string } = {};

    // Apply transformations
    for (const transformation of route.transformations) {
      switch (transformation.type) {
        case 'header_add':
          headers[transformation.config.name] = transformation.config.value;
          break;
        case 'header_remove':
          delete headers[transformation.config.name];
          break;
        case 'response_transform':
          response = this.transformResponse(response, transformation.config);
          break;
      }
    }

    return {
      success: serviceResponse.success,
      response,
      statusCode: serviceResponse.statusCode || 200,
      headers
    };
  }

  private transformResponse(response: any, config: any): any {
    // Simple response transformation
    if (config.type === 'wrap') {
      return { wrapped: response, timestamp: Date.now() };
    }
    return response;
  }

  private updateGatewayMetrics(success: boolean, processingTime: number): void {
    for (const gateway of this.gateways.values()) {
      gateway.metrics.totalRequests++;
      
      if (success) {
        gateway.metrics.successfulRequests++;
      } else {
        gateway.metrics.failedRequests++;
      }
      
      gateway.metrics.averageResponseTime = 
        (gateway.metrics.averageResponseTime * (gateway.metrics.totalRequests - 1) + processingTime) / gateway.metrics.totalRequests;
      
      gateway.metrics.errorRate = (gateway.metrics.failedRequests / gateway.metrics.totalRequests) * 100;
      gateway.metrics.requestsPerSecond = gateway.metrics.totalRequests / 60; // Assuming 1 minute window
    }

    this.saveGateways();
  }

  private updateMetrics(): void {
    for (const gateway of this.gateways.values()) {
      // Update requests per second
      gateway.metrics.requestsPerSecond = gateway.metrics.totalRequests / 60;
      
      // Update cache hit rate
      const cacheHits = Array.from(this.requests.values())
        .filter(req => req.processing.cacheHit)
        .length;
      
      if (gateway.metrics.totalRequests > 0) {
        gateway.metrics.cacheHitRate = (cacheHits / gateway.metrics.totalRequests) * 100;
      }
    }

    this.saveGateways();
  }

  private cleanupCache(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, cached] of this.cache) {
      if (cached.expires < now) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.emit('cacheCleaned', cleanedCount);
    }
  }

  private async performHealthChecks(): Promise<void> {
    for (const gateway of this.gateways.values()) {
      if (!gateway.status.isRunning) continue;

      for (const healthCheck of gateway.configuration.monitoring.healthChecks) {
        try {
          const response = await fetch(`http://${gateway.configuration.host}:${gateway.configuration.port}${healthCheck.endpoint}`, {
            method: 'GET',
            timeout: healthCheck.timeout
          });

          if (response.ok) {
            // Health check passed
            console.log(`Health check ${healthCheck.name} passed for gateway ${gateway.name}`);
          } else {
            // Health check failed
            gateway.status.errors.push({
              timestamp: Date.now(),
              type: 'health_check',
              message: `Health check ${healthCheck.name} failed`,
              count: 1
            });
          }
        } catch (error) {
          gateway.status.errors.push({
            timestamp: Date.now(),
            type: 'health_check',
            message: `Health check ${healthCheck.name} error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            count: 1
          });
        }
      }
    }

    this.saveGateways();
  }

  public getGateways(runningOnly?: boolean): APIGateway[] {
    let gateways = Array.from(this.gateways.values());

    if (runningOnly) {
      gateways = gateways.filter(g => g.status.isRunning);
    }

    return gateways.sort((a, b) => a.name.localeCompare(b.name));
  }

  public getEndpoints(service?: string, method?: string): APIEndpoint[] {
    let endpoints = Array.from(this.endpoints.values());

    if (service) {
      endpoints = endpoints.filter(e => e.service === service);
    }

    if (method) {
      endpoints = endpoints.filter(e => e.method === method);
    }

    return endpoints.sort((a, b) => a.path.localeCompare(b.path));
  }

  public getServices(type?: Service['type'], onlineOnly?: boolean): Service[] {
    let services = Array.from(this.services.values());

    if (type) {
      services = services.filter(s => s.type === type);
    }

    if (onlineOnly) {
      services = services.filter(s => s.status.isOnline);
    }

    return services.sort((a, b) => a.name.localeCompare(b.name));
  }

  public getRoutes(service?: string, priority?: number): Route[] {
    let routes = Array.from(this.routes.values());

    if (service) {
      routes = routes.filter(r => r.service === service);
    }

    if (priority !== undefined) {
      routes = routes.filter(r => r.priority >= priority);
    }

    return routes.sort((a, b) => b.priority - a.priority);
  }

  public getRequests(
    service?: string,
    status?: APIRequest['processing']['duration'],
    limit?: number
  ): APIRequest[] {
    let requests = Array.from(this.requests.values());

    if (service) {
      requests = requests.filter(r => r.routing.service === service);
    }

    if (status) {
      requests = requests.filter(r => r.processing.duration ? r.processing.duration >= status : false);
    }

    requests.sort((a, b) => b.timestamp - a.timestamp);
    return limit ? requests.slice(0, limit) : requests;
  }

  public getSystemStatus(): {
    totalGateways: number;
    runningGateways: number;
    totalEndpoints: number;
    totalServices: number;
    totalRoutes: number;
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    cacheHitRate: number;
  } {
    const gateways = Array.from(this.gateways.values());
    const endpoints = Array.from(this.endpoints.values());
    const services = Array.from(this.services.values());
    const routes = Array.from(this.routes.values());
    const requests = Array.from(this.requests.values());

    const totalMetrics = gateways.reduce((acc, gateway) => ({
      totalRequests: acc.totalRequests + gateway.metrics.totalRequests,
      successfulRequests: acc.successfulRequests + gateway.metrics.successfulRequests,
      failedRequests: acc.failedRequests + gateway.metrics.failedRequests,
      averageResponseTime: acc.averageResponseTime + gateway.metrics.averageResponseTime,
      errorRate: acc.errorRate + gateway.metrics.errorRate,
      cacheHitRate: acc.cacheHitRate + gateway.metrics.cacheHitRate
    }), {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      cacheHitRate: 0
    });

    return {
      totalGateways: gateways.length,
      runningGateways: gateways.filter(g => g.status.isRunning).length,
      totalEndpoints: endpoints.length,
      totalServices: services.length,
      totalRoutes: routes.length,
      totalRequests: totalMetrics.totalRequests,
      averageResponseTime: totalMetrics.totalRequests > 0 ? totalMetrics.averageResponseTime / totalMetrics.totalRequests : 0,
      errorRate: totalMetrics.errorRate
    };
  }

  public on(event: string, callback: Function): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
  }

  public off(event: string, callback: Function): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in callback for event ${event}:`, error);
        }
      });
    }
  }

  public cleanup(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    this.isProcessing = false;
    this.callbacks.clear();
    this.gateways.clear();
    this.endpoints.clear();
    this.services.clear();
    this.routes.clear();
    this.requests.clear();
    this.middleware.clear();
    this.cache.clear();
    this.rateLimiters.clear();
  }
}
