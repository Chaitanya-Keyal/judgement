import { mount } from 'svelte'
import '@fontsource-variable/inter'
import '@fontsource/zilla-slab/500.css'
import '@fontsource/zilla-slab/700.css'
import './app.css'
import App from './App.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
