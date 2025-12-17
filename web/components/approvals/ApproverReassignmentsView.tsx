type Reassignment = {
  at: string;
  from?: { id?: string | null; name?: string | null } | null;
  to?: { id?: string | null; name?: string | null } | null;
  actor?: { id?: string | null; name?: string | null } | null;
  comment?: string | null;
};

function formatPerson(person?: { id?: string | null; name?: string | null } | null) {
  if (!person) return "-";
  return person.name ?? person.id ?? "-";
}

export default function ApproverReassignmentsView(props: {
  items: Reassignment[];
  locale: string;
}) {
  if (!props.items.length) return null;

  return (
    <div className="rounded-2xl border bg-background/60 p-4">
      <ol className="space-y-3 text-sm">
        {props.items.map((item, index) => (
          <li key={`${item.at}-${index}`} className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {new Date(item.at).toLocaleString()}
            </p>
            <p className="font-medium text-foreground">
              {formatPerson(item.from)} → {formatPerson(item.to)}
            </p>
            <p className="text-xs text-muted-foreground">
              {props.locale === "zh" ? "操作人" : "Actor"}:{" "}
              {formatPerson(item.actor)}
            </p>
            {item.comment ? (
              <p className="text-xs text-muted-foreground">
                {props.locale === "zh" ? "备注" : "Comment"}: {item.comment}
              </p>
            ) : null}
            {index !== props.items.length - 1 && (
              <div className="pt-2">
                <div className="h-px bg-border" />
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
