-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ATIVO', 'INATIVO', 'PENDENTE');

-- CreateEnum
CREATE TYPE "TipoOcorrencia" AS ENUM ('RISCO', 'ALAGAMENTO', 'TRANSITO', 'INCENDIO', 'QUEDA_ARVORE', 'ACIDENTE', 'RESGATE', 'VAZAMENTO', 'OUTROS');

-- CreateEnum
CREATE TYPE "StatusOcorrencia" AS ENUM ('NOVO', 'EM_ANALISE', 'EM_ATENDIMENTO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "Prioridade" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDENTE',
    "telefone" TEXT NOT NULL,
    "avatar" TEXT,
    "permissoes" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ultimoAcesso" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "occurrences" (
    "id" TEXT NOT NULL,
    "tipo" "TipoOcorrencia" NOT NULL,
    "local" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "bairro" TEXT,
    "cidade" TEXT NOT NULL DEFAULT 'Recife',
    "estado" TEXT NOT NULL DEFAULT 'PE',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "status" "StatusOcorrencia" NOT NULL DEFAULT 'NOVO',
    "prioridade" "Prioridade" NOT NULL DEFAULT 'MEDIA',
    "descricao" TEXT,
    "observacoes" TEXT,
    "dataOcorrencia" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtendimento" TIMESTAMP(3),
    "dataConclusao" TIMESTAMP(3),
    "tempoResposta" INTEGER,
    "criadoPorId" TEXT NOT NULL,
    "responsavelId" TEXT,
    "fotos" JSONB NOT NULL DEFAULT '[]',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "occurrence_history" (
    "id" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "statusAnterior" "StatusOcorrencia",
    "statusNovo" "StatusOcorrencia" NOT NULL,
    "observacao" TEXT,
    "modificadoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "occurrence_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "detalhes" JSONB NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "occurrences_status_idx" ON "occurrences"("status");

-- CreateIndex
CREATE INDEX "occurrences_tipo_idx" ON "occurrences"("tipo");

-- CreateIndex
CREATE INDEX "occurrences_dataOcorrencia_idx" ON "occurrences"("dataOcorrencia");

-- CreateIndex
CREATE INDEX "occurrences_latitude_longitude_idx" ON "occurrences"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "occurrence_history_occurrenceId_idx" ON "occurrence_history"("occurrenceId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_chave_key" ON "system_config"("chave");

-- AddForeignKey
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occurrence_history" ADD CONSTRAINT "occurrence_history_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "occurrences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
