/** this type represents the way to access environment variables on the server side
 * typically process.env or import.meta.env on the server side
 */
export type LightAuthServerEnv = { [key: string]: string | undefined };
