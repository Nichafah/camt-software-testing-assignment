import { loadConfig } from '../../src/config';

describe('loadConfig', () => {
  describe('when no environment variables are set', () => {
    it('uses port 3000', () => {
      const env = {};

      const config = loadConfig(env);

      expect(config.port).toBe(3000);
    });

    it('uses the development database url', () => {
      const env = {};

      const config = loadConfig(env);

      expect(config.databaseUrl).toContain('election_dev');
    });

    it('uses the development jwt secret', () => {
      const env = {};

      const config = loadConfig(env);

      expect(config.jwtSecret).toBe('dev-secret');
    });
  });

  describe('when environment variables are provided', () => {
    it('reads PORT as a number', () => {
      const env = { PORT: '8080' };

      const config = loadConfig(env);

      expect(config.port).toBe(8080);
    });

    it('reads JWT_SECRET', () => {
      const env = { JWT_SECRET: 's' };

      const config = loadConfig(env);

      expect(config.jwtSecret).toBe('s');
    });

    it('reads DATABASE_URL', () => {
      const env = { DATABASE_URL: 'postgres://u:p@db:5432/other' };

      const config = loadConfig(env);

      expect(config.databaseUrl).toBe('postgres://u:p@db:5432/other');
    });
  });
});