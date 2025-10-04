import bcrypt from "bcrypt";
import { db } from "./server/db";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";

async function createTestUsers() {
  try {
    const hashedPassword = await bcrypt.hash("senha123", 10);
    
    const testUsers = [
      {
        email: "aluno@teste.com",
        password: hashedPassword,
        userType: "aluno",
        firstName: "Aluno",
        lastName: "Teste",
        name: "Aluno Teste",
        isActive: true,
        emailVerified: true
      },
      {
        email: "personal@teste.com",
        password: hashedPassword,
        userType: "personal",
        firstName: "Personal",
        lastName: "Teste",
        name: "Personal Teste",
        cref: "123456-G/SP",
        isActive: true,
        emailVerified: true
      },
      {
        email: "academia@teste.com",
        password: hashedPassword,
        userType: "academia",
        firstName: "Academia",
        lastName: "Teste",
        name: "Academia Teste",
        isActive: true,
        emailVerified: true
      }
    ];

    console.log("🔧 Criando usuários de teste...\n");
    
    for (const userData of testUsers) {
      // Verificar se já existe
      const existing = await db.select().from(users).where(eq(users.email, userData.email)).limit(1);
      
      if (existing.length > 0) {
        console.log(`⚠️  Usuário ${userData.email} já existe. Atualizando senha...`);
        await db.update(users)
          .set({ password: hashedPassword })
          .where(eq(users.email, userData.email));
        console.log(`✅ Senha atualizada para ${userData.email}`);
      } else {
        await db.insert(users).values(userData);
        console.log(`✅ Usuário criado: ${userData.email}`);
      }
    }
    
    console.log("\n🎉 Usuários de teste criados com sucesso!");
    console.log("\n📋 CREDENCIAIS DE ACESSO:");
    console.log("================================");
    console.log("Aluno:");
    console.log("  Email: aluno@teste.com");
    console.log("  Senha: senha123");
    console.log("\nPersonal Trainer:");
    console.log("  Email: personal@teste.com");
    console.log("  Senha: senha123");
    console.log("\nAcademia:");
    console.log("  Email: academia@teste.com");
    console.log("  Senha: senha123");
    console.log("================================\n");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao criar usuários:", error);
    process.exit(1);
  }
}

createTestUsers();
