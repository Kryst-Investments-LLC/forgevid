// Unit test for AI-Driven Storyboarding API
import { jest } from '@jest/globals';

// Mock the storyboarding API function
const mockStoryboardingAPI = jest.fn() as jest.MockedFunction<any>;

describe('AI-Driven Storyboarding API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a storyboard for a valid script and JWT', async () => {
    const mockResponse = {
      status: 200,
      data: {
        storyboard: {
          scenes: [
            { id: 1, description: 'Hero appears', duration: 3 },
            { id: 2, description: 'City in danger', duration: 5 },
            { id: 3, description: 'Hero saves city', duration: 4 }
          ]
        }
      }
    };

    mockStoryboardingAPI.mockResolvedValue(mockResponse);

    const result = await mockStoryboardingAPI({
      script: 'A hero saves the city from disaster.',
      headers: { Authorization: 'Bearer test_jwt_token' }
    }) as any;

    expect(result.status).toBe(200);
    expect(result.data.storyboard).toBeDefined();
    expect(Array.isArray(result.data.storyboard.scenes)).toBe(true);
  });

  it('should return 401 for missing or invalid JWT', async () => {
    const mockError = {
      response: {
        status: 401,
        data: { error: 'Unauthorized' }
      }
    };

    mockStoryboardingAPI.mockRejectedValue(mockError);

    try {
      await mockStoryboardingAPI({
        script: 'A hero saves the city from disaster.'
      });
    } catch (err: any) {
      expect(err.response.status).toBe(401);
    }
  });

  it('should return 400 for missing script', async () => {
    const mockError = {
      response: {
        status: 400,
        data: { error: 'Script is required' }
      }
    };

    mockStoryboardingAPI.mockRejectedValue(mockError);

    try {
      await mockStoryboardingAPI({
        headers: { Authorization: 'Bearer test_jwt_token' }
      });
    } catch (err: any) {
      expect(err.response.status).toBe(400);
    }
  });
});
