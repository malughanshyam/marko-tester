const { getComponent } = require('../../src/index');

it('should throw an error when no component is found', () => {
  expect(() => getComponent('./index.marko')).toThrowError('Cannot find specified component at "./index.marko".');
});
