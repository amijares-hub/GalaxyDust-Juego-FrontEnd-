import { supabase } from "../lib/supabase";

export const sendUserNotification = async ({
  userId,
  boxType,
  category,
  title,
  message,
  actionUrl
}: {
  userId: string;
  boxType: "system" | "expedition" | "combat" | "market";
  category: "SYSTEM" | "EXPEDITION" | "COMBAT" | "MARKET";
  title: string;
  message: string;
  actionUrl?: string;
}) => {
  try {
    const { error } = await supabase.from("user_notifications").insert({
      user_id: userId,
      box_type: boxType,
      category: category,
      title: title,
      message: message,
      action_url: actionUrl || null,
      is_read: false
    });

    if (error) throw error;
  } catch (err) {
    console.error("Fallo al registrar notificación en TAC-NET:", err);
  }
};
