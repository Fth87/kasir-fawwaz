// app/admin/manage-accounts/actions.ts

"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { UserRoles } from "@/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Skema validasi, tidak ada perubahan
const addUserFormSchema = z.object({
  email: z.string().email("Format email tidak valid."),
  password: z.string().min(6, "Password minimal 6 karakter."),
  role: z.enum(["admin", "cashier"]),
});

const updateUserSchema = z.object({
  role: z.enum(UserRoles),
  password: z.string().min(6, "Password baru minimal 6 karakter.").optional().or(z.literal("")),
});
// Tipe untuk data pengguna yang akan kita gunakan
export type UserData = {
  id: string;
  email: string | undefined;
  role: string;
};

// --- FUNGSI UNTUK MENGAMBIL DAFTAR PENGGUNA ---
export async function getUsers(): Promise<{ data: UserData[] | null; error: string | null; }> {
  try {
    const supabase = await createAdminClient();

    // 1. Ambil data pengguna dengan aman
    const { data, error } = await supabase.auth.admin.listUsers();

    // 2. Periksa error sebelum mengakses data
    if (error) throw error;

    // 3. Format data ke tipe yang kita inginkan
    const formattedUsers: UserData[] = data.users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'cashier',
    }));
    
    return { data: formattedUsers, error: null };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan tidak dikenal.";
    console.error("Error fetching users:", errorMessage);
    return { data: null, error: errorMessage };
  }
}

// --- FUNGSI UNTUK MEMBUAT PENGGUNA BARU ---
export async function createNewUser(formData: FormData) {
  try {
    const supabase = await createAdminClient();

    // Keamanan: Pastikan hanya admin yang bisa membuat pengguna baru
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.role !== 'admin') {
      throw new Error("Hanya admin yang dapat membuat pengguna baru.");
    }
    
    const validatedFields = addUserFormSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
      return { error: "Data yang dimasukkan tidak valid.", details: validatedFields.error.flatten().fieldErrors };
    }
    
    const { email, password, role } = validatedFields.data;

    const { error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role },
    });

    if (createUserError) throw createUserError;

    revalidatePath("/admin/manage-accounts");
    return { success: "Pengguna baru berhasil dibuat." };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan tidak dikenal.";
    console.error("Error creating user:", errorMessage);
    return { error: errorMessage };
  }
}

// --- FUNGSI UNTUK MENGHAPUS PENGGUNA ---
export async function deleteUser(userId: string) {
  try {
    const supabase = await createAdminClient();

    // Keamanan: Pastikan hanya admin yang bisa menghapus
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.role !== 'admin') {
      throw new Error("Hanya admin yang dapat menghapus pengguna.");
    }

    if (user.id === userId) {
        throw new Error("Anda tidak dapat menghapus akun Anda sendiri.");
    }

    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteUserError) throw deleteUserError;
    
    revalidatePath("/admin/manage-accounts");
    return { success: "Pengguna berhasil dihapus." };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan tidak dikenal.";
    console.error("Error deleting user:", errorMessage);
    return { error: errorMessage };
  }
}

export async function updateUser(userId: string, formData: FormData) {
  try {
    const supabase = await createClient(); // Klien standar untuk verifikasi
    const supabaseAdmin = await createAdminClient(); // Klien admin untuk aksi

    // Keamanan: Pastikan yang melakukan aksi adalah admin
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (adminUser?.user_metadata?.role !== 'admin') {
      throw new Error("Hanya admin yang dapat memperbarui pengguna.");
    }
    
    // Keamanan: Admin tidak bisa mengubah role-nya sendiri
    if (adminUser.id === userId && formData.get('role') !== 'admin') {
        throw new Error("Admin tidak dapat mengubah role-nya sendiri.");
    }

    const validatedFields = updateUserSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!validatedFields.success) {
      return { error: "Data tidak valid." };
    }

    const { role, password } = validatedFields.data;

    const userDataToUpdate: { user_metadata?: object, password?: string } = {
        user_metadata: { role }
    };

    // Hanya tambahkan password ke objek update jika diisi
    if (password) {
        userDataToUpdate.password = password;
    }
    
    const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      userDataToUpdate
    );

    if (updateUserError) throw updateUserError;

    revalidatePath("/admin/manage-accounts");
    return { success: "Data pengguna berhasil diperbarui." };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan.";
    return { error: errorMessage };
  }
}