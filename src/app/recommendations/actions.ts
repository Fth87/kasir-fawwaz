// app/recommendations/actions.ts

'use server';

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

// Skema untuk memvalidasi input dari form
const schema = z.object({
  period: z.enum(['last7days', 'last30days', 'last90days']),
});

// Inisialisasi Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export async function generatePriceRecommendations(formData: FormData) {
  const supabase = await createAdminClient();

  // 1. Validasi input & periksa sesi pengguna
  const validatedFields = schema.safeParse({ period: formData.get('period') });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!validatedFields.success || !user) {
    return { error: 'Permintaan tidak valid atau Anda tidak login.' };
  }

  // 2. Tentukan rentang tanggal berdasarkan input
  const days = parseInt(validatedFields.data.period.replace('last', '').replace('days', ''));
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);

  // 3. Ambil data yang relevan dari database
  try {
    const { data: transactions, error: txError } = await supabase.from('transactions').select('type, total_amount, details').gte('created_at', dateFrom.toISOString());

    const { data: inventory, error: invError } = await supabase.from('inventory_items').select('name, purchase_price, selling_price');

    if (txError || invError) throw txError || invError;

    // 4. Buat prompt cerdas untuk Gemini
    const prompt = `
      Anda adalah seorang konsultan bisnis untuk sebuah toko konter HP di Indonesia.
      Berdasarkan data berikut:

      1. Data Transaksi ${days} hari terakhir (JSON):
      ${JSON.stringify(transactions)}

      2. Daftar Harga Barang & Inventaris saat ini (JSON):
      ${JSON.stringify(inventory)}

      Tugas Anda:
      - Analisis data transaksi untuk memahami layanan dan barang apa yang paling laku dan mana yang kurang.
      - Bandingkan harga jual saat ini dengan pendapatan yang dihasilkan.
      - Berikan 2-3 rekomendasi penyesuaian harga (naikkan/turunkan) untuk memaksimalkan keuntungan.
      - Berikan alasan singkat dan jelas untuk setiap rekomendasi.

      Jawab HANYA dalam format JSON dengan struktur seperti ini: {"recommendations": "• Naikkan harga Ganti Baterai menjadi Rp 200.000.\\n• Turunkan harga Casing HP menjadi Rp 45.000.", "reasoning": "Ganti Baterai sangat laku dan marginnya masih bisa dinaikkan. Menurunkan harga Casing dapat meningkatkan volume penjualan barang."}
    `;

    // 5. Panggil Gemini dan kembalikan hasilnya
    const result = await model.generateContent(prompt);
    console.log('Gemini response:', result.response.text());
    const responseText = result.response.text();
    // Cari posisi '{' pertama dan '}' terakhir dalam string respons
    const firstBraceIndex = responseText.indexOf('{');
    const lastBraceIndex = responseText.lastIndexOf('}');

    if (firstBraceIndex === -1 || lastBraceIndex === -1) {
      throw new Error('Respons AI tidak mengandung format JSON yang valid.');
    }

    const jsonString = responseText.substring(firstBraceIndex, lastBraceIndex + 1);

    const jsonData = JSON.parse(jsonString);
    return { data: jsonData };
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return { error: 'Gagal mendapatkan rekomendasi dari AI. Coba lagi nanti.' };
  }
}
