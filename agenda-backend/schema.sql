-- Tabela de Usuários (Extensão do auth.users, ou stand-alone para mock local)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('coordenador', 'secretaria', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Cursos
CREATE TABLE IF NOT EXISTS cursos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Categorias
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cor_hex VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Compromissos
CREATE TABLE IF NOT EXISTS compromissos (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    dt_inicio TIMESTAMP NOT NULL,
    dt_fim TIMESTAMP NOT NULL,
    curso_id INTEGER REFERENCES cursos(id) ON DELETE SET NULL,
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    repeticao VARCHAR(50) CHECK (repeticao IN ('nenhuma', 'semanal', 'mensal')) DEFAULT 'nenhuma',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Lembretes
CREATE TABLE IF NOT EXISTS lembretes (
    id SERIAL PRIMARY KEY,
    compromisso_id INTEGER REFERENCES compromissos(id) ON DELETE CASCADE,
    email_destinatario VARCHAR(255) NOT NULL,
    dt_lembrete TIMESTAMP NOT NULL,
    enviado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
