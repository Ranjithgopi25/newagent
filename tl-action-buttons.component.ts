{ 

  "response_id": "RESP-ACC-2026-00142", 

  "request_id": "ACC-2026-00142", 

  "module": "contract_drafting", 

  "status": "draft_generated", 

  "generated_at": "2026-04-12T10:34:22Z", 

  "document": { 

    "title": "Non-Disclosure Agreement — Acme Corporation", 

    "version": "v0.1 (AI Draft)", 

    "word_count": 2840, 

    "sections": [ 

      "Parties and Recitals", 

      "Definition of Confidential Information", 

      "Obligations of Confidentiality", 

      "Permitted Disclosures", 

      "IP and Work Product Ownership", 

      "Data Protection", 

      "Term and Termination", 

      "Governing Law and Jurisdiction", 

      "General Provisions" 

    ], 

    "file_ref": "s3://accord-docs/drafts/ACC-2026-00142/NDA_Acme_v0.1.docx" 

  }, 

  "risk_summary": { 

    "overall_risk": "medium", 

    "flags": [ 

      { 

        "clause": "Liability Cap", 

        "risk_level": "high", 

        "note": "Cap set to contract value per instructions. Verify client acceptance." 

      }, 

      { 

        "clause": "Data Protection", 

        "risk_level": "medium", 

        "note": "GDPR compliance clauses included. Legal review recommended for NY addendum." 

      } 

    ] 

  }, 

  "routing": { 

    "routed_to": "risk_review", 

    "reason": "Medium risk score — value band 100k-500k with financial services industry flag", 

    "assigned_to": "risk_team_queue", 

    "sla_hours": 24 

  }, 

  "agent_metadata": { 

    "model": "claude-sonnet-4-20250514", 

    "template_used": "standard_nda_ny_v3", 

    "clauses_from_library": 9, 

    "generation_time_seconds": 18 

  } 

} 
