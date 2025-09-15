// Script para criar usuários de teste
import fetch from 'node-fetch';

async function createTestUsers() {
  const baseUrl = 'http://127.0.0.1:5000';
  
  try {
    // 1. Definir senha para usuário academia existente
    console.log('🔧 Definindo senha para usuário academia...');
    const academiaResponse = await fetch(`${baseUrl}/api/test/set-academia-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'contato@fitnessplus.com',
        password: 'academia123'
      })
    });
    
    const academiaResult = await academiaResponse.json();
    console.log('✅ Academia:', academiaResult);
    
    // 2. Criar usuário admin
    console.log('🔧 Criando usuário admin...');
    const adminResponse = await fetch(`${baseUrl}/api/test/create-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@teste.com',
        password: 'admin123',
        name: 'Administrador Teste'
      })
    });
    
    const adminResult = await adminResponse.json();
    console.log('✅ Admin:', adminResult);
    
    console.log('\n🎉 Usuários de teste criados com sucesso!');
    console.log('\n📋 Credenciais para acesso:');
    console.log('🏢 Academia:');
    console.log('   Email: contato@fitnessplus.com');
    console.log('   Senha: academia123');
    console.log('   Tipo: Academia');
    console.log('\n👨‍💼 Admin:');
    console.log('   Email: admin@teste.com');
    console.log('   Senha: admin123');
    console.log('   Tipo: Admin');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

createTestUsers();
