// #screen-settings: the household (time zone) and its products («Productos 6»), around the shell mocks.
import { HOUSEHOLD, ME, PRODUCTS } from './prototype-data';
import { mockShell, type MockApi } from './test';

export function mockSettings(api: MockApi, me: object = ME): MockApi {
  return mockShell(api, me).on('GET', '/households/h-casa', HOUSEHOLD).on('GET', '/households/h-casa/products', PRODUCTS);
}
