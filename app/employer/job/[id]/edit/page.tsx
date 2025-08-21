export default function EditJobPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Edit Job</h2>
      <p>Editing job with id {params.id} is not yet implemented.</p>
    </div>
  );
}