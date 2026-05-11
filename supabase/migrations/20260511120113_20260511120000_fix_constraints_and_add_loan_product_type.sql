/*
  # Fix document type CHECK constraint and add loan_product_type column

  1. Changes
    - Expand `documents.document_type` CHECK constraint to include all 16 types used by the frontend:
      national_id, passport, proof_of_residence, proof_of_employment, payslip,
      bank_statement, guarantor_document, collateral_insurance, disbursement_form,
      cr14, cr6, director_id, business_plan, collateral_document,
      proof_of_business_address, other
    - Add `loan_product_type` column to `loans` table (was missing from schema)
      with CHECK constraint matching the frontend's LoanProductType union

  2. Security
    - No RLS policy changes

  3. Important notes
    1. The old CHECK constraint on documents.document_type only allowed 7 values
       but the frontend UploadDocumentModal and types.ts define 16 document types.
       This caused INSERT failures when uploading documents with the expanded types.
    2. The loans table was missing the loan_product_type column entirely,
       which the frontend references in LoanCreatePage and LoanDetailPage.
*/

-- Drop old constraint and add new one with all document types
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_document_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_document_type_check
  CHECK (document_type = ANY (ARRAY[
    'national_id', 'passport', 'proof_of_residence', 'proof_of_employment',
    'payslip', 'bank_statement', 'guarantor_document', 'collateral_insurance',
    'disbursement_form', 'cr14', 'cr6', 'director_id', 'business_plan',
    'collateral_document', 'proof_of_business_address', 'other'
  ]::text[]));

-- Add loan_product_type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loans' AND column_name = 'loan_product_type'
  ) THEN
    ALTER TABLE loans ADD COLUMN loan_product_type text DEFAULT '';
    ALTER TABLE loans ADD CONSTRAINT loans_loan_product_type_check
      CHECK (loan_product_type = ANY (ARRAY[
        'salary_based', 'business_sme', 'agricultural', 'life_events',
        'product_based', 'micro_housing', 'specialized', ''
      ]::text[]));
  END IF;
END $$;
