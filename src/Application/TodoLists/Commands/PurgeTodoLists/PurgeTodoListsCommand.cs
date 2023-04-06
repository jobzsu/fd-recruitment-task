using MediatR;
using Todo_App.Application.Common.Interfaces;
using Todo_App.Application.Common.Security;

namespace Todo_App.Application.TodoLists.Commands.PurgeTodoLists;

[Authorize(Roles = "Administrator")]
[Authorize(Policy = "CanPurge")]
public record PurgeTodoListsCommand : IRequest;

public class PurgeTodoListsCommandHandler : IRequestHandler<PurgeTodoListsCommand>
{
    private readonly IApplicationDbContext _context;

    public PurgeTodoListsCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Unit> Handle(PurgeTodoListsCommand request, CancellationToken cancellationToken)
    {
        _context.TodoLists.ToList().ForEach(t => t.IsDeleted = true);

        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
