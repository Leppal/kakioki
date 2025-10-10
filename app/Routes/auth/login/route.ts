import { NextResponse } from "next/server";
import { UserRepository } from "@/lib";
import {
  ensureJwtSecretForProduction,
  generateToken,
} from "@/lib/Security/TokenLogic";
import { verifyPassword } from "@/lib/Security/ArgonConfig";
import {
  generateKeyPair,
  encryptPrivateKey,
} from "@/lib/Security/KeyEncryption";
import { getSodium } from "@/lib/Security/Sodium";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (email.length > 255) {
      return NextResponse.json({ error: "Email is too long" }, { status: 400 });
    }

    try {
      ensureJwtSecretForProduction();
    } catch (configError) {
      console.error("Login configuration error:", configError);
      return NextResponse.json(
        { error: "Server configuration error. Please try again later." },
        { status: 500 }
      );
    }

    const userRepository = new UserRepository();

    let user = await userRepository.findByEmail(email);
    if (!user || !user.password_hash) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    let publicKey = user.public_key ?? "";
    let secretKeyEncrypted = user.secret_key_encrypted ?? "";
    if (!publicKey || !secretKeyEncrypted) {
      const sodium = await getSodium();
      const { publicKey: pk, privateKey } = await generateKeyPair();
      publicKey = sodium.to_base64(
        pk,
        sodium.base64_variants.URLSAFE_NO_PADDING
      );
      secretKeyEncrypted = await encryptPrivateKey(privateKey, password);
      const updated = await userRepository.update(user.id, {
        public_key: publicKey,
        secret_key_encrypted: secretKeyEncrypted,
      });
      if (updated) {
        user = updated;
      } else {
        const fallback = await userRepository.findById(user.id);
        if (fallback) {
          user = fallback;
        }
      }
    }

    let token: string;
    try {
      token = generateToken({
        id: user.id,
        userId: user.user_id,
        email: user.email,
        username: user.username,
      });
    } catch (tokenError) {
      console.error("Login token generation error:", tokenError);
      return NextResponse.json(
        {
          error:
            "Authentication temporarily unavailable. Please try again later.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        userId: user.user_id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatar_url,
        publicKey,
        secretKeyEncrypted,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
