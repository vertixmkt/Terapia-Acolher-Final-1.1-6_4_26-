// PM2 Ecosystem — App Terapia Acolher
module.exports = {
  apps: [
    {
      name: 'acolher-backend',
      script: './dist/index.js',
      cwd: '/var/www/acolher/backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Reiniciar se usar mais de 512MB de RAM
      max_memory_restart: '512M',
      // Logs
      out_file: '/var/log/acolher/backend-out.log',
      error_file: '/var/log/acolher/backend-err.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      // Reinício automático em caso de crash
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
}
