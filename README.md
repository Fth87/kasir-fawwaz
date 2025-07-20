# Kasir Konter📱

## 🌟 Project Overview

Proyek ini bukan sekadar aplikasi. Ini adalah bentuk cinta dan balas budi seorang anak untuk orang tuanya. Sejak awal tahun 2000-an, orang tuaku sudah merintis usaha konter HP dengan penuh perjuangan semua serba manual. Nota ditulis tangan, laporan dicatat di buku tulis lusuh, dan tiap malam mereka masih harus rekap keuangan pakai kalkulator. Aku tumbuh besar melihat itu semua, melihat lelah yang mereka sembunyikan demi usaha yang tetap berjalan.

Setiap kali mereka lembur hanya untuk mencari catatan servis yang tercecer atau menghitung stok barang yang lupa dicatat, hatiku ikut tergerak. Aku tahu mereka pantas dapat yang lebih baik. Dan ketika aku mulai belajar tentang teknologi, saat itulah aku merasa: inilah jalanku untuk membantu mereka.

Dari situ, lahirlah project Kasir Konter. Bukan cuma sistem kasir digital, tapi solusi untuk meringankan beban mereka. Aku ubah tumpukan catatan jadi database, nota kertas jadi struk digital, kalkulator jadi analisis otomatis. Tujuannya bukan cuma bikin semua jadi cepat, tapi supaya mereka bisa punya waktu lebih untuk diri sendiri tanpa harus terus terikat pada rutinitas manual yang melelahkan.

Aplikasi ini adalah bentuk rasa terima kasihku. Warisan yang mereka bangun dengan keringat dan kesabaran, kini kuperjuangkan dengan baris kode dan ilmu yang kupelajari. Ini bukan akhir, tapi awal dari bab baru. Dan aku bangga bisa jadi bagian dari perjalanan ini.

## ✨ Fitur Utama (Features)

### Fitur Umum (Kasir & Admin)

- Dashboard: Tampilan ringkas pendapatan, pengeluaran, dan jumlah transaksi.
- Pencatatan Transaksi: Mencatat Penjualan, Servis, dan Pengeluaran dengan alur yang intuitif.
- Riwayat Transaksi: Melihat daftar semua transaksi dengan fitur pagination, sorting, dan filter.
- Detail & Cetak Struk: Melihat detail setiap transaksi dalam format struk, lengkap dengan QR Code untuk pelacakan status servis.
- Pelacakan Status Servis Publik: Pelanggan dapat melacak progres servis mereka melalui link publik tanpa perlu login.

### Fitur Khusus Admin

- Manajemen Inventaris: CRUD lengkap untuk barang, dilengkapi fitur "Restock" dan peringatan stok rendah.
- Manajemen Pelanggan (CRM): Kelola data pelanggan dan lihat riwayat transaksi lengkap per individu.
- Manajemen Servis: Perbarui status progres perbaikan dan kirim notifikasi ke pelanggan via WhatsApp.
- Manajemen Akun & Toko: Kelola akun pengguna (admin/kasir) dan atur informasi toko.
- Laporan & Analisis: Laporan finansial dinamis dengan filter rentang tanggal, rekap keuntungan, dan visualisasi data melalui grafik.

## 🧠 Dukungan AI (AI Support Explanation)

- AI digunakan secara relevan untuk memberikan dampak nyata pada hasil aplikasi. Gemini dari Google diintegrasikan melalui Server Actions untuk dua fitur utama:

- Rekomendasi Harga Cerdas: Saat admin menambah atau mengubah barang di inventaris, AI akan menganalisis nama barang dan harga beli untuk merekomendasikan harga jual yang optimal. Ini membantu memaksimalkan margin keuntungan berdasarkan data, bukan hanya intuisi.

- Ringkasan Laporan Otomatis: Di halaman laporan, admin dapat meminta AI untuk menganalisis data transaksi pada periode yang dipilih. AI akan memberikan ringkasan performa bisnis dalam bahasa natural, menyoroti tren penting, dan memberikan saran strategis yang bisa ditindaklanjuti untuk meningkatkan penjualan atau efisiensi.

## 🛠️ Teknologi yang Digunakan (Technologies Used)

- Framework: Next.js (App Router) dipilih karena kemampuannya dalam Server-Side Rendering (SSR) dan kemudahan dalam membuat Server Actions, yang krusial untuk keamanan dan performa.
- Bahasa: TypeScript digunakan untuk memastikan keamanan tipe (type-safety) dan skalabilitas kode.
- UI & Styling: Tailwind CSS dan ShadCN/UI dipilih untuk mempercepat pengembangan UI yang konsisten, modern, dan aksesibel.
- Database & Backend: Supabase berfungsi sebagai backend-as-a-service yang menyediakan database PostgreSQL, otentikasi, dan API instan. Database Functions & Triggers digunakan untuk otomatisasi (seperti pengurangan stok), memindahkan logika penting ke backend yang andal.
- Form Handling: React Hook Form & Zod digunakan untuk manajemen form yang efisien dan validasi skema yang kuat.
- Fungsionalitas AI: Google AI SDK (Gemini) dipilih karena kemampuannya yang canggih dalam pemrosesan bahasa dan JSON, yang menjadi dasar fitur rekomendasi cerdas.
- Lain-lain: recharts untuk visualisasi data, date-fns untuk manipulasi tanggal, dan next-nprogress-bar untuk UX yang lebih baik saat navigasi.

## ⚙️ Menjalankan Proyek Secara Lokal

### Prasyarat

- Node.js (versi 18 atau lebih baru)
- pnpm (direkomendasikan)

## Langkah-langkah Instalasi

### Clone repositori:

```
git clone https://github.com/Fth87/kasir-fawwaz.git
cd kasir-fawwaz
```

### Instal dependensi:

```
pnpm install
```

### Setup Supabase & env:

- Buat proyek baru di supabase.com.
- Jalankan semua file SQL dari proyek ini di SQL Editor untuk membuat skema database.
- Buat file .env.local dari .env.example.
- Isi variabel di .env.local dengan API key dari Supabase dan Google AI Studio.

### Jalankan server:

```
pnpm dev
```

Aplikasi sekarang akan berjalan di http://localhost:3000.

## 🔑 Environment Variabel (.env.local)

### Variabel untuk Klien (Browser) & Server

```
NEXT_PUBLIC_SUPABASE_URL=URL_PROYEK_SUPABASE_ANDA
NEXT_PUBLIC_SUPABASE_ANON_KEY=KUNCI_ANON_PUBLIK_ANDA
GEMINI_API_KEY=KUNCI_API_GEMINI_ANDA
```

## 📂 Struktur Proyek (Project Structure)

```
kasir-fawwaz/
├── src/
│   ├── app/                               # Rute dan halaman utama (App Router)
│   │   ├── admin/                         # Rute khusus Admin
│   │   │   ├── manage-accounts/
│   │   │   ├── manage-customers/
│   │   │   ├── manage-inventory/
│   │   │   └── ...                        # Folder admin lainnya
│   │   ├── login/                         # Halaman Login
│   │   ├── reports/                       # Halaman Laporan
│   │   ├── sales/                         # Halaman Rekam Penjualan
│   │   ├── service-status/[id]/          # Halaman Status Servis Publik
│   │   ├── transactions/[id]/            # Halaman Detail Transaksi (Struk)
│   │   └── layout.tsx                    # Layout utama aplikasi
│
│   ├── components/                        # Komponen UI yang dapat digunakan kembali
│   │   ├── layout/                        # Komponen spesifik untuk layout (e.g., AppLayout)
│   │   ├── reports/                       # Komponen-komponen untuk halaman laporan
│   │   └── ui/                            # Komponen dari shadcn/ui (Button, Card, dll)
│
│   ├── context/                           # React Context Providers (state global)
│   │   ├── auth-context.tsx
│   │   ├── customer-context.tsx
│   │   └── ...                            # Context lainnya
│
│   ├── hooks/                             # Custom React hooks
│   │   ├── use-debounce.ts
│   │   └── use-toast.ts
│
│   ├── lib/                               # Fungsi utilitas & konfigurasi library
│   │   └── supabase/                      # Konfigurasi klien Supabase (server, client)
│
│   ├── types/                             # Definisi tipe data TypeScript
│   │   ├── index.ts                       # Tipe-tipe utama aplikasi
│   │   └── supabase.ts                    # Tipe yang di-generate dari skema Supabase
│
│   └── utils/                             # Fungsi-fungsi helper umum
│       └── mapDBRowToTransaction.ts
│
├── .env.local                             # Variabel lingkungan (Rahasia)
├── middleware.ts                          # Middleware untuk proteksi rute
├── next.config.mjs                        # Konfigurasi Next.js
├── package.json                           # Metadata dan dependensi proyek
└── tsconfig.json                          # Konfigurasi TypeScript
```

---

## 🗺️ Rencana Pengembangan (Roadmap)

- [ ] Fitur PWA menginstal aplikasi di perangkat mobile.
- [ ] Dashboard yang Lebih Detail: Menambahkan lebih banyak metrik dan grafik.
