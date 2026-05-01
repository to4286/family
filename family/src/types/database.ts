/**
 * 관계별 질문 순서. 해당 관계에서 질문을 쓰지 않으면 null.
 * Supabase `questions` 테이블의 order 컬럼들과 동일한 의미.
 */
export type QuestionRelationOrder = number | null;

/** Supabase `questions` 테이블 */
export interface Question {
  id: number;
  /** 1: 일상, 2: 취향, 3: 추억, 4: 속마음 */
  category_id: number;
  question_text: string;
  parent_order: QuestionRelationOrder;
  child_order: QuestionRelationOrder;
  spouse_order: QuestionRelationOrder;
  sibling_order: QuestionRelationOrder;
  created_at?: string;
}
