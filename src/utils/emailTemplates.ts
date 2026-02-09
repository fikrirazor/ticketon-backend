export const getApprovedEmailTemplate = (userName: string, eventTitle: string, amount: string) => `
  <div style="font-family: sans-serif; padding: 20px; color: #333;">
    <h2 style="color: #f97316;">Tiket Anda Telah Terkonfirmasi!</h2>
    <p>Halo <strong>${userName}</strong>,</p>
    <p>Pembayaran Anda untuk event <strong>${eventTitle}</strong> telah berhasil diverifikasi.</p>
    <div style="background-color: #f8fafc; padding: 15px; border-radius: 10px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Total Bayar:</strong> ${amount}</p>
      <p style="margin: 0;"><strong>Status:</strong> Sistem Terverifikasi</p>
    </div>
    <p>Silakan cek halaman transaksi Anda untuk melihat e-tiket.</p>
    <p>Sampai jumpa di event!</p>
    <br>
    <p>Salam,<br>Team Ticketon</p>
  </div>
`;

export const getRejectedEmailTemplate = (
  userName: string,
  eventTitle: string,
  reason: string = "Bukti pembayaran tidak sesuai atau tidak valid.",
) => `
  <div style="font-family: sans-serif; padding: 20px; color: #333;">
    <h2 style="color: #ef4444;">Transaksi Dibatalkan</h2>
    <p>Halo <strong>${userName}</strong>,</p>
    <p>Mohon maaf, transaksi Anda untuk event <strong>${eventTitle}</strong> telah ditolak.</p>
    <div style="background-color: #fef2f2; padding: 15px; border-radius: 10px; margin: 20px 0; border: 1px solid #fee2e2;">
      <p style="margin: 0; color: #b91c1c;"><strong>Alasan:</strong> ${reason}</p>
    </div>
    <p>Jangan khawatir, <strong>poin, voucher, dan kursi Anda telah dikembalikan secara otomatis</strong> ke akun Anda.</p>
    <p>Silakan lakukan pemesanan ulang jika diperlukan atau hubungi bantuan jika ini adalah kesalahan.</p>
    <br>
    <p>Salam,<br>Team Ticketon</p>
  </div>
`;

export const getForgotPasswordEmailTemplate = (userName: string, resetLink: string) => `
  <div style="font-family: sans-serif; padding: 20px; color: #333;">
    <h2 style="color: #f97316;">Permintaan Reset Password</h2>
    <p>Halo <strong>${userName}</strong>,</p>
    <p>Kami menerima permintaan untuk mereset password akun Ticketon Anda.</p>
    <p>Silakan klik tombol di bawah ini untuk melanjutkan:</p>
    <div style="margin: 30px 0;">
      <a href="${resetLink}" style="background-color: #f97316; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
    </div>
    <p>Link ini hanya berlaku selama 1 jam.</p>
    <p>Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini.</p>
    <p>Salam,<br>Team Ticketon</p>
  </div>
`;

export const getWelcomeEmailTemplate = (userName: string) => `
  <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6;">
    <h2 style="color: #f97316;">Selamat Datang di Ticketon!</h2>
    <p>Halo <strong>${userName}</strong>,</p>
    <p>Terima kasih telah bergabung dengan Ticketon, platform discovery event terbesar di Indonesia.</p>
    <p>Sekarang Anda dapat menjelajahi ribuan event seru, membeli tiket dengan mudah, dan menikmati berbagai promo menarik.</p>
    <div style="background-color: #fff7ed; padding: 20px; border-radius: 10px; border: 1px solid #ffedd5; margin: 25px 0;">
      <h3 style="margin-top: 0; color: #ea580c;">Apa yang bisa Anda lakukan sekarang?</h3>
      <ul style="padding-left: 20px;">
        <li>Telusuri event di kota Anda.</li>
        <li>Gunakan poin dan voucher untuk harga lebih hemat.</li>
        <li>Kelola tiket Anda dalam satu aplikasi.</li>
      </ul>
    </div>
    <p>Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi tim support kami.</p>
    <br>
    <p>Salam hangat,<br>Team Ticketon</p>
  </div>
`;
