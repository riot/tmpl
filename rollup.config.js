import npm from 'rollup-plugin-npm'
import commonjs from 'rollup-plugin-commonjs'

export default {
  plugins: [
    npm(),
    commonjs({
      include: 'node_modules/**'
    })
  ],
  format: 'umd'
}