import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitize } from "../api/_lib/vision.ts";

test("sanitize: converte reais em centavos e separa parcela", () => {
  const [item] = sanitize({
    items: [{ kind: "expense", description: " Geladeira ", amount: 149.99, installment: 12, installments: 18, account: "Mercado Pago" }],
  });
  assert.equal(item.amount_cents, 14999);
  assert.equal(item.description, "Geladeira");
  assert.deepEqual([item.installment, item.installments], [12, 18]);
  assert.equal(item.account, "Mercado Pago");
});

test("sanitize: descarta itens sem valor, sem nome ou malformados", () => {
  const items = sanitize({
    items: [
      { kind: "expense", description: "", amount: 10 },
      { kind: "expense", description: "Nada", amount: 0 },
      { kind: "expense", description: "Texto", amount: "10" },
      null,
      { kind: "income", description: "Freela", amount: 300 },
    ],
  });
  assert.deepEqual(items.map((i) => i.description), ["Freela"]);
});

test("sanitize: parcela inválida vira lançamento único; tipo desconhecido vira despesa", () => {
  const [a, b] = sanitize({
    items: [
      { kind: "expense", description: "A", amount: 5, installment: 9, installments: 3 },
      { kind: "hack", description: "B", amount: 5, date: "ontem" },
    ],
  });
  assert.equal(a.installments, null);
  assert.equal(a.installment, null);
  assert.equal(b.kind, "expense");
  assert.equal(b.date, null);
});

test("sanitize: resposta fora do formato não quebra", () => {
  assert.deepEqual(sanitize(null), []);
  assert.deepEqual(sanitize({ items: "x" }), []);
});
