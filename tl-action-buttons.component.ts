 graph.add_conditional_edges(
        "COMPRESS_ENFORCE",
        lambda s: bool(getattr(s, "edit_after_compress", False)),
        {
            True: "EDIT_SEQUENCE",
            False: "VALIDATE",
        },
    )
