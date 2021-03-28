// More details: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    public: { url: "/", static: true },
    src: { url: "/dist" },
  },

  optimize: {
    bundle: true,
    minify: true,
    target: "es2018",
  },
};
