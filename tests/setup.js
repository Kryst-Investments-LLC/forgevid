"use client"

import "@testing-library/jest-dom"
import { jest, afterEach } from "@jest/globals"

// Route handlers import both NextAuth entry points. Mock them before test
// modules load so Jest never has to parse NextAuth's browser-only ESM graph.
const mockGetServerSession = jest.fn()
jest.mock("next-auth", () => ({
  __esModule: true,
  default: jest.fn(),
  getServerSession: mockGetServerSession,
}))
jest.mock("next-auth/next", () => ({ getServerSession: mockGetServerSession }))
jest.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: jest.fn(() => ({})),
}))

// Mock Next.js router
jest.mock("next/router", () => ({
  useRouter() {
    return {
      route: "/",
      pathname: "/",
      query: {},
      asPath: "/",
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return "/"
  },
}))

// Mock environment variables
process.env.NEXTAUTH_URL = "http://localhost:3000"
process.env.NEXTAUTH_SECRET = "test-secret"
process.env.STRIPE_SECRET_KEY = "sk_test_123"

// Mock fetch globally
global.fetch = jest.fn()

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock performance API
Object.defineProperty(window, "performance", {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
  },
})

// Mock TextEncoder and TextDecoder for Node.js environment
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Ensure WHATWG Request/Response are available (Node >=18)
try {
  const { Request, Response, Headers } = require('undici')
  global.Request = Request
  global.Response = Response
  global.Headers = Headers
} catch (error) {
  // Next ships the same Fetch API primitives used by route handlers. JSDOM
  // replaces Node's globals, so use the bundled implementation when undici is
  // not a direct dependency.
  const { setImmediate, clearImmediate } = require('timers')
  const {
    TextEncoderStream,
    TextDecoderStream,
    TransformStream,
    ReadableStream,
    WritableStream,
  } = require('stream/web')
  global.setImmediate = setImmediate
  global.clearImmediate = clearImmediate
  global.TextEncoderStream = TextEncoderStream
  global.TextDecoderStream = TextDecoderStream
  global.TransformStream = TransformStream
  global.ReadableStream = ReadableStream
  global.WritableStream = WritableStream
  if (typeof global.structuredClone === 'undefined') {
    const { serialize, deserialize } = require('v8')
    global.structuredClone = (value) => deserialize(serialize(value))
  }
  const { Request, Response, Headers } = require('next/dist/compiled/@edge-runtime/primitives')
  global.Request = Request
  global.Response = Response
  global.Headers = Headers
}

// Mock fetch with proper implementation
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
)

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
})
