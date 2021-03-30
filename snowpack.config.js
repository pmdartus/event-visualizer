// More details: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
export default {
  mount: {
    public: { url: "/", static: true },
    src: { url: "/" },
  },

  buildOptions: {
    out: "dist",
  },

  optimize: {
    bundle: true,
    minify: true,
    target: "es2018",
  },
};
