var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "CLOSED";
    CircuitState["OPEN"] = "OPEN";
    CircuitState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitState || (CircuitState = {}));
export class CircuitBreaker {
    name;
    state = CircuitState.CLOSED;
    failureCount = 0;
    lastFailureTime = 0;
    successCount = 0;
    config;
    constructor(name, config) {
        this.name = name;
        this.config = {
            ...config,
            failureThreshold: config.failureThreshold ?? 5,
            recoveryTimeout: config.recoveryTimeout ?? 60000, // 1 minute
            monitoringPeriod: config.monitoringPeriod ?? 10000, // 10 seconds
        };
    }
    async execute(operation) {
        if (this.state === CircuitState.OPEN) {
            if (this.shouldAttemptReset()) {
                this.state = CircuitState.HALF_OPEN;
                console.log(`[Circuit Breaker] ${this.name} moved to HALF_OPEN state`);
            }
            else {
                throw new Error(`Circuit breaker ${this.name} is OPEN`);
            }
        }
        try {
            const result = await operation();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure(error);
            throw error;
        }
    }
    onSuccess() {
        this.failureCount = 0;
        if (this.state === CircuitState.HALF_OPEN) {
            this.successCount++;
            if (this.successCount >= 3) {
                this.state = CircuitState.CLOSED;
                this.successCount = 0;
                console.log(`[Circuit Breaker] ${this.name} moved to CLOSED state`);
            }
        }
    }
    onFailure(error) {
        // Check if this is an expected error that shouldn't trigger circuit breaker
        if (this.config.expectedErrors?.some((expectedError) => error.message.includes(expectedError))) {
            return;
        }
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.state === CircuitState.HALF_OPEN) {
            this.state = CircuitState.OPEN;
            this.successCount = 0;
            console.log(`[Circuit Breaker] ${this.name} moved to OPEN state (failure in HALF_OPEN)`);
        }
        else if (this.failureCount >= this.config.failureThreshold) {
            this.state = CircuitState.OPEN;
            console.log(`[Circuit Breaker] ${this.name} moved to OPEN state (threshold exceeded)`);
        }
    }
    shouldAttemptReset() {
        return Date.now() - this.lastFailureTime >= this.config.recoveryTimeout;
    }
    getState() {
        return this.state;
    }
    getStats() {
        return {
            name: this.name,
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            lastFailureTime: this.lastFailureTime,
            config: this.config,
        };
    }
    reset() {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = 0;
        console.log(`[Circuit Breaker] ${this.name} manually reset`);
    }
}
export class CircuitBreakerRegistry {
    static breakers = new Map();
    static create(name, config) {
        const breaker = new CircuitBreaker(name, config);
        this.breakers.set(name, breaker);
        return breaker;
    }
    static get(name) {
        return this.breakers.get(name);
    }
    static getOrCreate(name, config) {
        return this.get(name) || this.create(name, config);
    }
    static getAllStats() {
        return Array.from(this.breakers.values()).map((breaker) => breaker.getStats());
    }
    static resetAll() {
        this.breakers.forEach((breaker) => breaker.reset());
    }
}
// Pre-configured circuit breakers for common services
export const DatabaseCircuitBreaker = CircuitBreakerRegistry.getOrCreate("database", {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    monitoringPeriod: 10000,
});
export const AIServiceCircuitBreaker = CircuitBreakerRegistry.getOrCreate("ai-service", {
    failureThreshold: 3,
    recoveryTimeout: 60000,
    monitoringPeriod: 15000,
    expectedErrors: ["rate_limit_exceeded", "quota_exceeded"],
});
export const VideoProcessingCircuitBreaker = CircuitBreakerRegistry.getOrCreate("video-processing", {
    failureThreshold: 2,
    recoveryTimeout: 120000,
    monitoringPeriod: 20000,
});
export const ExternalAPICircuitBreaker = CircuitBreakerRegistry.getOrCreate("external-api", {
    failureThreshold: 10,
    recoveryTimeout: 45000,
    monitoringPeriod: 5000,
});
