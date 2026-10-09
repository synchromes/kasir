import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import mariadb from 'mariadb';

dotenv.config({ quiet: true });
const url = new URL(process.env.DATABASE_URL);
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname) && (!url.port || url.port === '3306'));
// Jalankan hanya setelah PID server MySQL pengujian sudah diverifikasi.
const connection = await mariadb.createConnection({
  host: url.hostname, port: Number(url.port || 3306),
  user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
});
try {
  await connection.query('SHUTDOWN');
  console.log('MySQL pengujian dihentikan dengan SHUTDOWN.');
} finally {
  connection.destroy();
}
