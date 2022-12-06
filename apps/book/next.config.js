// eslint-disable-next-line @typescript-eslint/no-var-requires
const withNx = require('@nrwl/next/plugins/with-nx');
const withVant = require('next-transpile-modules')(['react-vant']);

// This plugin is needed until this PR is merged.
// https://github.com/vercel/next.js/pull/23185
const withLess = require('@nrwl/next/plugins/with-less');

/**
 * @type {import('@nrwl/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  nx: {
    // Set this to true if you would like to to use SVGR
    // See: https://github.com/gregberge/svgr
    svgr: false,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  api: {
    responseLimit: false,
  },
};

module.exports = withVant(withLess(withNx(nextConfig)));
