import { defineConfig } from 'astro/config';
export default defineConfig({devToolbar:{enabled:false},site: process.env.SITE_URL || 'https://ibaraki-dev-website.ba068082.workers.dev', output: 'static'});
