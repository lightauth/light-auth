
import typescript from "@rollup/plugin-typescript";
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

export default
    {
        input: {
            index: 'lib/login.ts',
        },
        output:
        {
            dir: "public",
            format: "esm",
            entryFileNames: "js/[name].js",
            sourcemap: true,
        },
        treeshake: {
            moduleSideEffects: false,
            propertyReadSideEffects: false
        },
        plugins: [
            typescript({ typescript: require("typescript") }),
            resolve(), // Resolves node_modules
            commonjs(), // Converts CommonJS to ES modules
        ]
    }

