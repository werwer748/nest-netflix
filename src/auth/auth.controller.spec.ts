import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Role, User } from '../user/entity/user.entity';
import { IReqestUser } from './interfaces/request-user.interface';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  tokenBlock: jest.fn(),
  issueToken: jest.fn(),
};

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        }
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(authController).toBeDefined();
  });

  describe('registerUser', () => {
    it('should register a user', async () => {
      const token = 'Basic dasdasdasd';
      const result = { id: 1, email: 'test@codefactory.ai' }

      jest.spyOn(authService, 'register').mockResolvedValue(result as User);

      await expect(authController.registerUser(token)).resolves.toEqual(result);
      expect(authService.register).toHaveBeenCalledWith(token);
    });
  });

  describe('loginUser', () => {
    it('should login a user', async () => {
      const token = 'Basic dasdasdasd';
      const result = {
        accessToken: 'access.token',
        refreshToken: 'refresh.token',
      };

      jest.spyOn(authService, 'login').mockResolvedValue(result);

      await expect(authController.loginUser(token)).resolves.toEqual(result);
      expect(authService.login).toHaveBeenCalledWith(token);
    });
  });

  describe('blockToken', () => {
    it('should block token', async () => {
      const token = 'some.jwt.token';

      jest.spyOn(authService, 'tokenBlock').mockResolvedValue(true);

      await expect(authController.blockToken(token)).resolves.toBe(true);
      expect(authService.tokenBlock).toHaveBeenCalledWith(token);
    });
  });

  describe('rotateAccessToken', () => {
    it('should rotate access token', async () => {
      const user = { id: 1, role: Role.user } as User;
      const accessToken = 'access.token';
      const req = { user } as unknown as IReqestUser;

      jest.spyOn(authService, 'issueToken').mockResolvedValue(accessToken);

      const result = await authController.rotateAccessToken(req);

      await expect(authController.rotateAccessToken(req)).resolves.toEqual(result);
      expect(authService.issueToken).toHaveBeenCalledWith(user, false);
    });
  });

  describe('loginUserPassport', () => {
    it('should login user with passport', async () => {
      const user = { id: 1, role: Role.user } as User;
      const token = 'jwt.token'
      const req = { user } as unknown as IReqestUser;
      const accessToken = 'mocked.access.token';
      const refreshToken = 'mocked.refresh.token';


      jest.spyOn(authService, 'issueToken').mockResolvedValueOnce(accessToken);
      jest.spyOn(authService, 'issueToken').mockResolvedValueOnce(refreshToken);

      const result = await authController.loginUserPassport(req);
      expect(authService.issueToken).toHaveBeenCalledTimes(2);
      expect(authService.issueToken).toHaveBeenNthCalledWith(1, user, false);
      expect(authService.issueToken).toHaveBeenNthCalledWith(2, user, true);
      expect(result).toEqual({ accessToken, refreshToken });
    });
  });
});
