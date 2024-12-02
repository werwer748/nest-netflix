import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { Repository } from 'typeorm';
import { Role, User } from '../user/entity/user.entity';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { UserService } from '../user/user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const mockUserRepository = {
  findOne: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
  decode: jest.fn(),
};

const mockCacheManager = {
  set: jest.fn(),
};

const mockUserService = {
  create: jest.fn(),
};


describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: Repository<User>;
  let configService: ConfigService;
  let jwtService: JwtService;
  let cacheManager: Cache;
  let userService: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          // 캐시 모킹하는 방법
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    configService = module.get<ConfigService>(ConfigService);
    jwtService = module.get<JwtService>(JwtService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('tokenBlock', () => {
    it('should block token', async () => {
      const token = 'token';
      const payload = {
        exp: (Math.floor(Date.now() / 1000)) + 60,
      };

      jest.spyOn(mockJwtService, 'decode').mockReturnValue(payload);

      await authService.tokenBlock(token);

      expect(jwtService.decode).toHaveBeenCalledWith(token);
      expect(cacheManager.set).toHaveBeenCalledWith(
        `BLOCK_TOKEN_${token}`,
        payload,
        expect.any(Number), // 숫자가 들어간것만 확인하면 된다.
      )
    });
  });

  describe('parseBasicToken', () => {
    it('should parse a valid Basic token', () => {
      const rawToken = 'Basic dGVzdEBleGFtcGxlLmNvbToxMjM0NTY=';
      // native한 값들로 검증이 이루어지기 때문에 실제 값으로 테스트한다.
      const result = authService.parseBasicToken(rawToken);

      const decode = { email: 'test@example.com', password: '123456' };

      expect(result).toEqual(decode);
    });

    it('should throw an error for invalid token format', () => {
      const rawToken = 'InvalidTokenFormat';

      // 프라미스가 아닌 에러확인을 위해서는 꼭 expect에 함수로 테스트를 작성해야 한다.
      expect(() => authService.parseBasicToken(rawToken)).toThrow(
        BadRequestException,
      );
    });

    it('should throw an error for invalid Basic token format', () => {
      const rawToken = 'Bearer InvalidTokenFormat';

      // 프라미스가 아닌 에러확인을 위해서는 꼭 expect에 함수로 테스트를 작성해야 한다.
      expect(() => authService.parseBasicToken(rawToken)).toThrow(
        BadRequestException,
      );
    });

    it('should throw an error for invalid Basic token format', () => {
      const rawToken = 'Basic a';

      // 프라미스가 아닌 에러확인을 위해서는 꼭 expect에 함수로 테스트를 작성해야 한다.
      expect(() => authService.parseBasicToken(rawToken)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('parseBearerToken', () => {
    it('should parse a valid Bearer Token', async () => {
      const rawToken = 'Bearer token';
      const paylaod = { type: 'access' };

      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(paylaod);
      jest.spyOn(configService, 'get').mockReturnValue('secret');

      const result = await authService.parseBearerToken(rawToken, false);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('token', {
        secret: 'secret'
      });
      expect(result).toEqual(paylaod);
    });

    it('should throw a BadRequestException for invalid Bearer token format', () => {
      const rawToken = 'a';
      // 프로미스에러는 expect().rejects
      expect(authService.parseBearerToken(rawToken, false)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw a BadRequestException for token not starting with Bearer', () => {
      const rawToken = 'Basic token';
      expect(authService.parseBearerToken(rawToken, false)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw a BadRequestException for if payload.type is not refresh but isRefreshToken parameter is true', () => {
      const rawToken = 'Bearer token';

      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({ type: 'refresh' });

      expect(authService.parseBearerToken(rawToken, false)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw a BadRequestException for if payload.type is refresh but isRefreshToken parameter is false', () => {
      const rawToken = 'Bearer token';

      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({ type: 'access' });

      expect(authService.parseBearerToken(rawToken, true)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const rawToken = 'basic abcd';
      const user = {
        email: 'test@example.com',
        password: '123456',
      };

      jest.spyOn(authService, 'parseBasicToken').mockReturnValue(user);
      jest.spyOn(mockUserService, 'create').mockResolvedValue(user as User);

      const result = await authService.register(rawToken);

      expect(authService.parseBasicToken).toHaveBeenCalledWith(rawToken);
      // expect(mockUserService.create).toHaveBeenCalledWith(user);
      expect(userService.create).toHaveBeenCalledWith(user);
      expect(result).toEqual(user);
    });
  });

  describe('authenticate', () => {
    it('should authenticate a user with correct credentials', async () => {
      const email = 'test@example.com';
      const password = '123456';
      const user = { email, password: 'hashedpassword'};

      jest.spyOn(mockUserRepository, 'findOne').mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockImplementation((_a, _b) => true);

      const result = await authService.authenticate(email, password);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(bcrypt.compare).toHaveBeenCalledWith(password, user.password);
      expect(result).toEqual(user);
    });

    it('should throw an error for not existing user', async () => {
      jest.spyOn(mockUserRepository, 'findOne').mockResolvedValue(null);

      await expect(authService.authenticate('test@aaa.com', '123123'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw an error for incorrect password', async () => {
      const user = {
        email: 'test@example2.com',
        password: 'hashedpassword',
      };
      const password = '123456';

      jest.spyOn(mockUserRepository, 'findOne').mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockImplementation((_a, _b) => false);

      // expect(bcrypt.compare).toHaveBeenCalledWith(password, user.password);
      await expect(authService.authenticate(user.email, password))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('issueToken', ()=>{
    const user = {id: 1, role: Role.user};
    const token = 'token';

    //* describe 내부에서 공통으로 사용되는 코드가 있을 경우 beforeEach를 사용하여 줄일 수 있다.
    beforeEach(()=>{
      jest.spyOn(mockConfigService, 'get').mockReturnValue('secret');
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue(token);
    })

    it('should issue an access token', async ()=>{
      const result = await authService.issueToken(user as User, false);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        {sub: user.id, type: 'access', role: user.role},
        {secret: 'secret', expiresIn: 300},
      );
      expect(result).toBe(token);
    })

    it('should issue an refresh token', async ()=>{
      const result = await authService.issueToken(user as User, true);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        {sub: user.id, type: 'refresh', role: user.role},
        {secret: 'secret', expiresIn: '24h'},
      );
      expect(result).toBe(token);
    })
  });

  describe('login', () => {
    it('should login a user and return tokens', async () => {
      const rawToken = 'Basic asdf';
      const email = 'test@codefactory.ai';
      const password = '123123';
      const user = { id: 1, email, role: Role.user };

      jest.spyOn(authService, 'parseBasicToken').mockReturnValue({ email, password });
      jest.spyOn(authService, 'authenticate').mockResolvedValue(user as User);
      jest.spyOn(authService, 'issueToken').mockResolvedValue('mocked.token');

      const result = await authService.login(rawToken);

      expect(authService.parseBasicToken).toHaveBeenCalledWith(rawToken);
      expect(authService.authenticate).toHaveBeenCalledWith(email, password);
      expect(authService.issueToken).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        refreshToken: 'mocked.token',
        accessToken: 'mocked.token',
      });
    });
  });
});
