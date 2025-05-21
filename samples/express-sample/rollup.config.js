
import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { terser } from 'rollup-plugin-terser';
import babel from 'rollup-plugin-babel';
export default
    {
        input: 'lib/login.ts',

        output:
        {
            file: 'public/js/index.js',
            format: "iife",
            sourcemap: true,
            inlineDynamicImports: true,
        },
        treeshake: {
            moduleSideEffects: false,
            propertyReadSideEffects: false
        },
        plugins: [
            typescript({ typescript: require("typescript") }),
            resolve({
                browser: true,
                preferBuiltins: false,
            }),
            commonjs(),
            babel(),
        ]
    }

