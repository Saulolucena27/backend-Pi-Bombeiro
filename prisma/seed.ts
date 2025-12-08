import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed do banco de dados...');

  // Limpar dados existentes
  await prisma.auditLog.deleteMany();
  await prisma.occurrenceHistory.deleteMany();
  await prisma.occurrence.deleteMany();
  await prisma.user.deleteMany();

  // ==================== USUÁRIOS ====================
  console.log('Criando usuários...');

  const adminSenha = await bcrypt.hash('admin123', 10);
  const userSenha = await bcrypt.hash('senha123', 10);

  const admin = await prisma.user.create({
    data: {
      nome: 'Administrador Sistema',
      email: 'admin@bombeiros.pe.gov.br',
      senha: adminSenha,
      cargo: 'Comandante',
      departamento: 'Gestão',
      status: 'ATIVO',
      telefone: '(81) 99999-0001',
      avatar: 'AS',
      permissoes: ['Visualizar', 'Editar', 'Excluir', 'Aprovar', 'Gerenciar'],
      ultimoAcesso: new Date()
    }
  });

  const coordenador = await prisma.user.create({
    data: {
      nome: 'João Silva Santos',
      email: 'joao.silva@bombeiros.pe.gov.br',
      senha: userSenha,
      cargo: 'Coordenador',
      departamento: 'Operações',
      status: 'ATIVO',
      telefone: '(81) 99999-0002',
      avatar: 'JS',
      permissoes: ['Visualizar', 'Editar', 'Aprovar'],
      ultimoAcesso: new Date()
    }
  });

  const analista = await prisma.user.create({
    data: {
      nome: 'Maria Oliveira Costa',
      email: 'maria.oliveira@bombeiros.pe.gov.br',
      senha: userSenha,
      cargo: 'Analista',
      departamento: 'Análise de Risco',
      status: 'ATIVO',
      telefone: '(81) 99999-0003',
      avatar: 'MO',
      permissoes: ['Visualizar', 'Editar'],
      ultimoAcesso: new Date(Date.now() - 2 * 60 * 60 * 1000)
    }
  });

  const tecnico = await prisma.user.create({
    data: {
      nome: 'Carlos Alberto Lima',
      email: 'carlos.lima@bombeiros.pe.gov.br',
      senha: userSenha,
      cargo: 'Técnico',
      departamento: 'Campo',
      status: 'ATIVO',
      telefone: '(81) 99999-0004',
      avatar: 'CA',
      permissoes: ['Visualizar', 'Editar'],
      ultimoAcesso: new Date(Date.now() - 5 * 60 * 60 * 1000)
    }
  });

  const pendente = await prisma.user.create({
    data: {
      nome: 'Ana Paula Santos',
      email: 'ana.santos@bombeiros.pe.gov.br',
      senha: userSenha,
      cargo: 'Estagiária',
      departamento: 'Administrativo',
      status: 'PENDENTE',
      telefone: '(81) 99999-0005',
      avatar: 'AP',
      permissoes: ['Visualizar']
    }
  });

  console.log(`✅ ${5} usuários criados`);

  // ==================== OCORRÊNCIAS ====================
  console.log('🚨 Criando ocorrências...');

  const tiposOcorrencia = [
    'INCENDIO',
    'ALAGAMENTO',
    'TRANSITO',
    'RISCO',
    'QUEDA_ARVORE',
    'ACIDENTE',
    'RESGATE',
    'VAZAMENTO'
  ];

  const bairrosRecife = [
    'Boa Viagem',
    'Casa Amarela',
    'Centro',
    'Várzea',
    'Pina',
    'Ibura',
    'Piedade',
    'Torre',
    'Encruzilhada',
    'Afogados'
  ];

  const coordenadasRecife = [
    { lat: -8.1137, lng: -34.9048, bairro: 'Boa Viagem' },
    { lat: -8.0300, lng: -34.9200, bairro: 'Casa Amarela' },
    { lat: -8.0603, lng: -34.8710, bairro: 'Centro' },
    { lat: -8.0400, lng: -34.9600, bairro: 'Várzea' },
    { lat: -8.0900, lng: -34.8800, bairro: 'Pina' },
    { lat: -8.1190, lng: -35.0040, bairro: 'Ibura' },
    { lat: -8.0650, lng: -34.8820, bairro: 'Piedade' },
    { lat: -8.0500, lng: -34.8900, bairro: 'Torre' },
    { lat: -8.0800, lng: -34.9100, bairro: 'Encruzilhada' },
    { lat: -8.0700, lng: -34.9300, bairro: 'Afogados' }
  ];

  const descricoes = {
    INCENDIO: [
      'Princípio de incêndio em residência',
      'Incêndio em vegetação seca',
      'Fogo em estabelecimento comercial',
      'Incêndio em veículo'
    ],
    ALAGAMENTO: [
      'Alagamento de via pública',
      'Água acumulada em área residencial',
      'Risco de inundação',
      'Bueiro entupido causando alagamento'
    ],
    TRANSITO: [
      'Acidente de trânsito com vítimas',
      'Colisão entre veículos',
      'Atropelamento de pedestre',
      'Veículo capotado'
    ],
    RISCO: [
      'Risco de desabamento',
      'Estrutura comprometida',
      'Árvore em risco de queda',
      'Fissuras em edificação'
    ],
    QUEDA_ARVORE: [
      'Árvore caída bloqueando via',
      'Galhos em risco de queda',
      'Árvore sobre fiação elétrica',
      'Queda de árvore em propriedade'
    ],
    ACIDENTE: [
      'Acidente de trabalho',
      'Queda de altura',
      'Acidente doméstico',
      'Ferimento grave'
    ],
    RESGATE: [
      'Pessoa ilhada por enchente',
      'Resgate em área de difícil acesso',
      'Animal preso em local perigoso',
      'Pessoa em situação de risco'
    ],
    VAZAMENTO: [
      'Vazamento de gás',
      'Vazamento de água',
      'Vazamento de produto químico',
      'Rompimento de tubulação'
    ]
  };

  const occurrences = [];

  for (let i = 0; i < 50; i++) {
    const tipo = tiposOcorrencia[Math.floor(Math.random() * tiposOcorrencia.length)] as any;
    const coordenada = coordenadasRecife[Math.floor(Math.random() * coordenadasRecife.length)];
    const descricaoLista = descricoes[tipo as keyof typeof descricoes];
    const descricao = descricaoLista[Math.floor(Math.random() * descricaoLista.length)];

    // Variar as datas nos últimos 30 dias
    const diasAtras = Math.floor(Math.random() * 30);
    const horasAtras = Math.floor(Math.random() * 24);
    const dataOcorrencia = new Date(Date.now() - diasAtras * 24 * 60 * 60 * 1000 - horasAtras * 60 * 60 * 1000);

    // Definir status baseado na antiguidade
    let status;
    let dataAtendimento = null;
    let dataConclusao = null;
    let tempoResposta = null;

    if (diasAtras > 20) {
      status = 'CONCLUIDO';
      dataAtendimento = new Date(dataOcorrencia.getTime() + Math.random() * 2 * 60 * 60 * 1000);
      dataConclusao = new Date(dataAtendimento.getTime() + Math.random() * 5 * 60 * 60 * 1000);
      tempoResposta = Math.floor((dataAtendimento.getTime() - dataOcorrencia.getTime()) / 60000);
    } else if (diasAtras > 10) {
      status = 'EM_ATENDIMENTO';
      dataAtendimento = new Date(dataOcorrencia.getTime() + Math.random() * 2 * 60 * 60 * 1000);
      tempoResposta = Math.floor((dataAtendimento.getTime() - dataOcorrencia.getTime()) / 60000);
    } else if (diasAtras > 3) {
      status = 'EM_ANALISE';
    } else {
      status = 'NOVO';
    }

    const prioridades = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];
    const prioridade = tipo === 'INCENDIO' || tipo === 'ACIDENTE' || tipo === 'RESGATE'
      ? prioridades[Math.floor(Math.random() * 2) + 2] // ALTA ou CRITICA
      : prioridades[Math.floor(Math.random() * 3)]; // BAIXA, MEDIA ou ALTA

    // Adicionar variação nas coordenadas para não sobrepor
    const latVariacao = (Math.random() - 0.5) * 0.01;
    const lngVariacao = (Math.random() - 0.5) * 0.01;

    const occurrence = await prisma.occurrence.create({
      data: {
        tipo: tipo as any,
        local: `Rua ${Math.floor(Math.random() * 500) + 1}`,
        endereco: `Rua ${Math.floor(Math.random() * 500) + 1}, ${coordenada.bairro}, Recife - PE`,
        bairro: coordenada.bairro,
        latitude: coordenada.lat + latVariacao,
        longitude: coordenada.lng + lngVariacao,
        status: status as any,
        prioridade: prioridade as any,
        descricao,
        dataOcorrencia,
        dataAtendimento,
        dataConclusao,
        tempoResposta,
        criadoPorId: [admin.id, coordenador.id, analista.id, tecnico.id][Math.floor(Math.random() * 4)],
        responsavelId: status !== 'NOVO' 
          ? [coordenador.id, analista.id, tecnico.id][Math.floor(Math.random() * 3)]
          : null
      }
    });

    occurrences.push(occurrence);
  }

  console.log(`✅ ${occurrences.length} ocorrências criadas`);

  // ==================== HISTÓRICO ====================
  console.log('📝 Criando histórico de alterações...');

  let historicoCount = 0;
  for (const occ of occurrences.filter(o => o.status !== 'NOVO')) {
    await prisma.occurrenceHistory.create({
      data: {
        occurrenceId: occ.id,
        statusAnterior: 'NOVO',
        statusNovo: 'EM_ANALISE',
        observacao: 'Ocorrência recebida e em análise',
        modificadoPor: coordenador.id,
        createdAt: new Date(occ.dataOcorrencia.getTime() + 30 * 60 * 1000)
      }
    });
    historicoCount++;

    if (occ.status === 'EM_ATENDIMENTO' || occ.status === 'CONCLUIDO') {
      await prisma.occurrenceHistory.create({
        data: {
          occurrenceId: occ.id,
          statusAnterior: 'EM_ANALISE',
          statusNovo: 'EM_ATENDIMENTO',
          observacao: 'Equipe despachada para atendimento',
          modificadoPor: coordenador.id,
          createdAt: occ.dataAtendimento!
        }
      });
      historicoCount++;
    }

    if (occ.status === 'CONCLUIDO') {
      await prisma.occurrenceHistory.create({
        data: {
          occurrenceId: occ.id,
          statusAnterior: 'EM_ATENDIMENTO',
          statusNovo: 'CONCLUIDO',
          observacao: 'Ocorrência atendida e finalizada',
          modificadoPor: tecnico.id,
          createdAt: occ.dataConclusao!
        }
      });
      historicoCount++;
    }
  }

  console.log(`✅ ${historicoCount} registros de histórico criados`);

  // ==================== RESUMO ====================
  console.log('\n📊 RESUMO DO SEED:');
  console.log('================================');
  console.log(`👤 Usuários: ${await prisma.user.count()}`);
  console.log(`🚨 Ocorrências: ${await prisma.occurrence.count()}`);
  console.log(`📝 Histórico: ${await prisma.occurrenceHistory.count()}`);
  console.log('================================\n');

  console.log('📝 CREDENCIAIS DE ACESSO:');
  console.log('================================');
  console.log('Admin:');
  console.log('  Email: admin@bombeiros.pe.gov.br');
  console.log('  Senha: admin123');
  console.log('\nCoordenador:');
  console.log('  Email: joao.silva@bombeiros.pe.gov.br');
  console.log('  Senha: senha123');
  console.log('\nAnalista:');
  console.log('  Email: maria.oliveira@bombeiros.pe.gov.br');
  console.log('  Senha: senha123');
  console.log('================================\n');

  console.log('✅ Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });