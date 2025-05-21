import pkg from "./package.json" with { type: "json" };
import typescript from "@rollup/plugin-typescript";

const libraryHeader = `/*! ${pkg.name} v${pkg.version} ${new Date().toISOString().split("T")[0]} */`;

export default
    [

        {
            input: {
                index: 'src/index.ts',
            },
            output:
            {
                dir: "dist",
                format: "es",
                entryFileNames: "[name].mjs",
                banner: libraryHeader,
                sourcemap: true,
                intro: "'use strict';"
            },

            jsx: {
                mode: 'automatic',
                factory: 'React.createElement',
                importSource: 'react',
                jsxImportSource: 'react/jsx-runtime'
            },
            treeshake: {
                moduleSideEffects: false,
                propertyReadSideEffects: false
            },
            plugins: [
                typescript({ typescript: require("typescript") }),
            ],
            external: [
                ...Object.keys(pkg.dependencies || {}),
                ...Object.keys(pkg.peerDependencies || {}),
                "nuxt/app",
                "#app"
            ],

        },
        {
            input: {
                index: 'src/client/index.ts',
            },
            output:
            {
                dir: "dist",
                format: "es",
                entryFileNames: "client/[name].mjs",
                banner: libraryHeader,
                sourcemap: true,
                intro: "'use client';"
            },

            jsx: {
                mode: 'automatic',
                factory: 'React.createElement',
                importSource: 'react',
                jsxImportSource: 'react/jsx-runtime'
            },
            treeshake: {
                moduleSideEffects: false,
                propertyReadSideEffects: false
            },
            plugins: [
                typescript({ typescript: require("typescript") }),
            ],
            external: [
                ...Object.keys(pkg.dependencies || {}),
                ...Object.keys(pkg.peerDependencies || {}),
                "nuxt/app",
                "#app"
            ],

        }
    ]
